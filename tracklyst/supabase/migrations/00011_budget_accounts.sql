-- ------------------------------------------------------------
-- Comptes d'un budget : l'argent d'un budget est réparti sur plusieurs
-- comptes (MVola, BNI, espèces…). Chaque dépense / revenu indique son
-- compte ; les transferts déplacent l'argent d'un compte à l'autre sans
-- changer le total du budget.
--
--  - budget_accounts   : comptes (nom chiffré côté appareil, solde de départ)
--  - transactions / recurring_rules : account_id (facultatif)
--  - account_transfers : transferts entre comptes d'un même budget
--  - get_account_balances(budget) : solde de chaque compte
--  - get_budget_stats : le solde de départ inclut celui des comptes
--
-- Existant : chaque budget reçoit un premier compte (son étiquette, sinon
-- « Compte principal ») qui reprend son solde de départ et ses transactions.
-- ------------------------------------------------------------

CREATE TABLE public.budget_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'other'
    CHECK (kind IN ('mobile_money', 'bank', 'savings', 'cash', 'other')),
  name TEXT,
  initial_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_accounts_budget_id ON public.budget_accounts(budget_id);

ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage accounts of accessible budgets"
  ON public.budget_accounts FOR ALL
  USING (public.can_access_budget(budget_id))
  WITH CHECK (public.can_access_budget(budget_id));

CREATE TRIGGER update_budget_accounts_updated_at
  BEFORE UPDATE ON public.budget_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transactions
  ADD COLUMN account_id UUID REFERENCES public.budget_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.recurring_rules
  ADD COLUMN account_id UUID REFERENCES public.budget_accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);

-- ------------------------------------------------------------
-- Transferts entre comptes
-- ------------------------------------------------------------
CREATE TABLE public.account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_account_id <> to_account_id)
);

CREATE INDEX idx_account_transfers_budget_id ON public.account_transfers(budget_id);

ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage transfers of accessible budgets"
  ON public.account_transfers FOR ALL
  USING (public.can_access_budget(budget_id))
  WITH CHECK (public.can_access_budget(budget_id));

-- Les deux comptes d'un transfert (et le compte d'une transaction)
-- doivent appartenir au même budget.
CREATE OR REPLACE FUNCTION public.check_account_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'account_transfers' THEN
    IF NOT EXISTS (SELECT 1 FROM public.budget_accounts WHERE id = NEW.from_account_id AND budget_id = NEW.budget_id)
       OR NOT EXISTS (SELECT 1 FROM public.budget_accounts WHERE id = NEW.to_account_id AND budget_id = NEW.budget_id) THEN
      RAISE EXCEPTION 'account_budget_mismatch';
    END IF;
  ELSIF NEW.account_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.budget_accounts WHERE id = NEW.account_id AND budget_id = NEW.budget_id) THEN
    RAISE EXCEPTION 'account_budget_mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER account_transfers_check_budget
  BEFORE INSERT OR UPDATE ON public.account_transfers
  FOR EACH ROW EXECUTE FUNCTION public.check_account_budget();
CREATE TRIGGER transactions_check_account_budget
  BEFORE INSERT OR UPDATE OF account_id, budget_id ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_account_budget();
CREATE TRIGGER recurring_rules_check_account_budget
  BEFORE INSERT OR UPDATE OF account_id, budget_id ON public.recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.check_account_budget();

-- ------------------------------------------------------------
-- Solde de chaque compte (+ ligne account_id NULL : mouvements non attribués)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_account_balances(p_budget_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (account_id UUID, balance DECIMAL(12, 2)) AS $$
BEGIN
  IF NOT public.can_access_budget(p_budget_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH flows AS (
    SELECT t.account_id AS acc,
           SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS amount
    FROM public.transactions t
    WHERE t.budget_id = p_budget_id AND t.date <= p_date
    GROUP BY t.account_id
  ),
  moves AS (
    SELECT x.to_account_id AS acc, SUM(x.amount) AS amount FROM public.account_transfers x
    WHERE x.budget_id = p_budget_id AND x.date <= p_date GROUP BY x.to_account_id
    UNION ALL
    SELECT x.from_account_id, -SUM(x.amount) FROM public.account_transfers x
    WHERE x.budget_id = p_budget_id AND x.date <= p_date GROUP BY x.from_account_id
  )
  SELECT a.id,
         (a.initial_amount
           + COALESCE((SELECT f.amount FROM flows f WHERE f.acc = a.id), 0)
           + COALESCE((SELECT SUM(m.amount) FROM moves m WHERE m.acc = a.id), 0))::DECIMAL(12, 2)
  FROM public.budget_accounts a
  WHERE a.budget_id = p_budget_id
  UNION ALL
  SELECT NULL::UUID, COALESCE((SELECT f.amount FROM flows f WHERE f.acc IS NULL), 0)::DECIMAL(12, 2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_account_balances(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_balances(UUID, DATE) TO authenticated;

-- ------------------------------------------------------------
-- get_budget_stats : solde de départ = budget + comptes
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_budget_stats(
  p_budget_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_income DECIMAL(12, 2),
  total_expense DECIMAL(12, 2),
  available_balance DECIMAL(12, 2),
  locked_in_goals DECIMAL(12, 2)
) AS $$
DECLARE
  v_initial_amount DECIMAL(12, 2);
  v_total_income DECIMAL(12, 2);
  v_total_expense DECIMAL(12, 2);
  v_locked_goals DECIMAL(12, 2);
BEGIN
  IF NOT public.can_access_budget(p_budget_id) THEN
    RETURN;
  END IF;

  SELECT COALESCE(b.initial_amount, 0)
         + COALESCE((SELECT SUM(a.initial_amount) FROM public.budget_accounts a WHERE a.budget_id = b.id), 0)
  INTO v_initial_amount
  FROM public.budgets b
  WHERE b.id = p_budget_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_income
  FROM public.transactions
  WHERE budget_id = p_budget_id AND type = 'income' AND date <= p_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
  FROM public.transactions
  WHERE budget_id = p_budget_id AND type = 'expense' AND date <= p_date;

  SELECT COALESCE(SUM(current_amount), 0) INTO v_locked_goals
  FROM public.goals
  WHERE budget_id = p_budget_id AND status IN ('in_progress', 'completed');

  RETURN QUERY SELECT
    v_total_income,
    v_total_expense,
    (v_initial_amount + v_total_income - v_total_expense) - v_locked_goals,
    v_locked_goals;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- Existant : un premier compte par budget, qui reprend le solde de départ,
-- les transactions et les abonnements. Le nom déjà chiffré (e1:…) reste
-- lisible : il est chiffré avec la clé du même budget.
-- ------------------------------------------------------------
INSERT INTO public.budget_accounts (budget_id, kind, name, initial_amount)
SELECT b.id, COALESCE(b.account_kind, 'other'), COALESCE(b.account_name, 'Compte principal'), COALESCE(b.initial_amount, 0)
FROM public.budgets b;

-- Chaque budget n'a ici qu'un seul compte.
UPDATE public.transactions t SET account_id = a.id
FROM public.budget_accounts a WHERE a.budget_id = t.budget_id;

UPDATE public.recurring_rules r SET account_id = a.id
FROM public.budget_accounts a WHERE a.budget_id = r.budget_id;

UPDATE public.budgets SET initial_amount = 0;
