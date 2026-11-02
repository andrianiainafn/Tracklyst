-- ------------------------------------------------------------
-- Plafond mensuel par catégorie de dépense (essence, abonnements,
-- petites dépenses…). NULL = pas de plafond. Porté directement par
-- la catégorie : les politiques RLS de categories s'appliquent.
-- ------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN monthly_limit DECIMAL(12, 2)
    CHECK (monthly_limit IS NULL OR monthly_limit > 0);

-- ------------------------------------------------------------
-- Nouvelles catégories par défaut : Essence + Petites dépenses
-- ------------------------------------------------------------
INSERT INTO public.categories (budget_id, name, type, icon, color)
SELECT b.id, v.name, 'expense', v.icon, v.color
FROM public.budgets b
CROSS JOIN (VALUES
  ('Essence', '⛽', '#0EA5E9'),
  ('Petites dépenses', '🧾', '#A855F7')
) AS v(name, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.budget_id = b.id AND c.type = 'expense' AND lower(c.name) = lower(v.name)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_budget_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.budgets (name, owner_type, owner_id, currency)
  VALUES ('Mon Budget', 'user', NEW.id, 'EUR')
  RETURNING id INTO new_budget_id;

  INSERT INTO public.categories (budget_id, name, type, icon, color)
  VALUES
    (new_budget_id, 'Salaire', 'income', '💰', '#10B981'),
    (new_budget_id, 'Autre revenu', 'income', '💵', '#34D399'),
    (new_budget_id, 'Loyer', 'expense', '🏠', '#EF4444'),
    (new_budget_id, 'Courses', 'expense', '🛒', '#F59E0B'),
    (new_budget_id, 'Transport', 'expense', '🚗', '#3B82F6'),
    (new_budget_id, 'Essence', 'expense', '⛽', '#0EA5E9'),
    (new_budget_id, 'Abonnements', 'expense', '📱', '#8B5CF6'),
    (new_budget_id, 'Loisirs', 'expense', '🎮', '#EC4899'),
    (new_budget_id, 'Restaurant', 'expense', '🍽️', '#F97316'),
    (new_budget_id, 'Santé', 'expense', '💊', '#06B6D4'),
    (new_budget_id, 'Petites dépenses', 'expense', '🧾', '#A855F7'),
    (new_budget_id, 'Autre dépense', 'expense', '💸', '#6B7280');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
