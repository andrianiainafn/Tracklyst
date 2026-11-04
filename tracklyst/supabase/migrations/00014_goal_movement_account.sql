-- ------------------------------------------------------------
-- Compte d'un versement / retrait d'objectif : le versement sort d'un
-- compte (BNI, MVola…), le retrait y revient.
--  - goal_transactions.account_id (facultatif ; les anciens mouvements
--    restent sans compte et ne changent le solde d'aucun compte)
--  - get_account_balances : solde du compte − versements + retraits
-- Le solde disponible du budget (get_budget_stats) ne change pas : l'argent
-- des objectifs y était déjà déduit.
-- ------------------------------------------------------------

ALTER TABLE public.goal_transactions
  ADD COLUMN account_id UUID REFERENCES public.budget_accounts(id) ON DELETE SET NULL;

CREATE TRIGGER goal_transactions_check_account_budget
  BEFORE INSERT OR UPDATE OF account_id, budget_id ON public.goal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_account_budget();

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
    UNION ALL
    -- Objectifs : un versement sort du compte, un retrait y revient.
    SELECT g.account_id, SUM(CASE WHEN g.type = 'deposit' THEN -g.amount ELSE g.amount END)
    FROM public.goal_transactions g
    WHERE g.budget_id = p_budget_id AND g.account_id IS NOT NULL AND g.date <= p_date
    GROUP BY g.account_id
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
