-- ------------------------------------------------------------
-- Fonction récupération des stats par budget (pour cartes + progress bar)
-- Inclut initial_amount du budget
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
  SELECT COALESCE(initial_amount, 0) INTO v_initial_amount
  FROM public.budgets
  WHERE id = p_budget_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
