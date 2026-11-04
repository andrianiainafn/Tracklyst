-- ------------------------------------------------------------
-- Modifier ou supprimer un versement / retrait d'objectif.
--  - goal_transactions : règles UPDATE et DELETE (membres du budget)
--  - le montant épargné (goals.current_amount) est recalculé par la base à
--    chaque mouvement : somme des versements − somme des retraits, et le
--    statut passe à « completed » / « in_progress » selon la cible. Un total
--    négatif est refusé (« goal_negative »).
-- Les versions de l'app qui mettent encore current_amount à jour elles-mêmes
-- écrivent la même valeur : le recalcul est sans conflit.
-- ------------------------------------------------------------

CREATE POLICY "Users can update goal_transactions of accessible budgets"
  ON public.goal_transactions FOR UPDATE
  USING (public.can_access_budget(budget_id))
  WITH CHECK (public.can_access_budget(budget_id));

CREATE POLICY "Users can delete goal_transactions of accessible budgets"
  ON public.goal_transactions FOR DELETE
  USING (public.can_access_budget(budget_id));

CREATE OR REPLACE FUNCTION public.recompute_goal_amount(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current DECIMAL(12, 2);
BEGIN
  -- Objectif (ou budget) en cours de suppression : rien à recalculer.
  IF NOT EXISTS (SELECT 1 FROM public.goals WHERE id = p_goal_id) THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
  INTO v_current
  FROM public.goal_transactions
  WHERE goal_id = p_goal_id;

  -- Plus retiré que versé : refusé (ex. suppression d'un versement déjà retiré).
  IF v_current < 0 THEN
    RAISE EXCEPTION 'goal_negative';
  END IF;

  UPDATE public.goals
  SET current_amount = v_current,
      status = CASE
        WHEN status IN ('in_progress', 'completed') THEN
          CASE WHEN v_current >= target_amount THEN 'completed' ELSE 'in_progress' END
        ELSE status
      END
  WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.recompute_goal_amount(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_goal_transaction_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recompute_goal_amount(OLD.goal_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.goal_id <> OLD.goal_id) THEN
    PERFORM public.recompute_goal_amount(NEW.goal_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER goal_transactions_recompute_goal
  AFTER INSERT OR UPDATE OR DELETE ON public.goal_transactions
  FOR EACH ROW EXECUTE FUNCTION public.on_goal_transaction_changed();
