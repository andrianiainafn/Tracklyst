-- ------------------------------------------------------------
-- calculate_balance ignorait les soldes de départ (celui du budget, puis
-- ceux des comptes depuis 00011) : l'écran de versement d'objectif, l'ajout
-- de transaction et les cartes de budgets voyaient un solde faux, souvent
-- négatif, alors que l'accueil (get_budget_stats) affichait le bon.
-- Même calcul que get_budget_stats désormais.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_balance(p_budget_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_balance DECIMAL(12, 2),
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
    v_initial_amount + v_total_income - v_total_expense,
    v_initial_amount + v_total_income - v_total_expense - v_locked_goals,
    v_locked_goals;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.calculate_balance(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_balance(UUID, DATE) TO authenticated;
