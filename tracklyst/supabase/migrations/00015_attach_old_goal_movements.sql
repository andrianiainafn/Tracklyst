-- Les versements / retraits d'objectif faits avant les comptes (00014) n'ont
-- pas de compte : ils n'étaient retirés d'aucun compte, qui affichait donc
-- aussi l'argent mis de côté. On les rattache au premier compte du budget
-- (celui créé par 00011 à partir de l'ancien solde du budget).
UPDATE public.goal_transactions g
SET account_id = (
  SELECT a.id FROM public.budget_accounts a
  WHERE a.budget_id = g.budget_id
  ORDER BY a.created_at, a.position
  LIMIT 1
)
WHERE g.account_id IS NULL
  AND EXISTS (SELECT 1 FROM public.budget_accounts a WHERE a.budget_id = g.budget_id);
