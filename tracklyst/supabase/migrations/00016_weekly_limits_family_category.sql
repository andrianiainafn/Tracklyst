-- ------------------------------------------------------------
-- 1. Plafond par semaine : monthly_limit garde le montant,
--    limit_period dit s'il vaut pour le mois ou la semaine
--    (lundi → dimanche).
-- ------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS limit_period TEXT NOT NULL DEFAULT 'month'
    CHECK (limit_period IN ('month', 'week'));

-- ------------------------------------------------------------
-- 2. Nouvelle catégorie par défaut : Cotisation familiale
-- ------------------------------------------------------------
INSERT INTO public.categories (budget_id, name, type, icon, color)
SELECT b.id, 'Cotisation familiale', 'expense', 'account-group-outline', '#14B8A6'
FROM public.budgets b
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.budget_id = b.id AND c.type = 'expense' AND lower(c.name) = 'cotisation familiale'
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_budget_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  INSERT INTO public.budgets (name, owner_type, owner_id, currency)
  VALUES ('Mon Budget', 'user', NEW.id, 'MGA')
  RETURNING id INTO new_budget_id;

  INSERT INTO public.categories (budget_id, name, type, icon, color)
  VALUES
    (new_budget_id, 'Salaire', 'income', 'cash-multiple', '#10B981'),
    (new_budget_id, 'Autre revenu', 'income', 'wallet-outline', '#34D399'),
    (new_budget_id, 'Loyer', 'expense', 'home-outline', '#EF4444'),
    (new_budget_id, 'Courses', 'expense', 'cart-outline', '#F59E0B'),
    (new_budget_id, 'Transport', 'expense', 'car-outline', '#3B82F6'),
    (new_budget_id, 'Essence', 'expense', 'gas-station-outline', '#0EA5E9'),
    (new_budget_id, 'Abonnements', 'expense', 'autorenew', '#8B5CF6'),
    (new_budget_id, 'Loisirs', 'expense', 'gamepad-variant-outline', '#EC4899'),
    (new_budget_id, 'Restaurant', 'expense', 'silverware-fork-knife', '#F97316'),
    (new_budget_id, 'Santé', 'expense', 'medical-bag', '#06B6D4'),
    (new_budget_id, 'Cotisation familiale', 'expense', 'account-group-outline', '#14B8A6'),
    (new_budget_id, 'Petites dépenses', 'expense', 'receipt-text-outline', '#A855F7'),
    (new_budget_id, 'Autre dépense', 'expense', 'dots-horizontal-circle-outline', '#64748B');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
