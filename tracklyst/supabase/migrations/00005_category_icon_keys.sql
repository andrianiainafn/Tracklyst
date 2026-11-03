-- ------------------------------------------------------------
-- categories.icon : emojis → noms d'icônes MaterialCommunityIcons.
-- L'app affiche de vraies icônes ; elle sait encore lire les anciens
-- emojis, mais les nouvelles données ne doivent plus en contenir.
-- ------------------------------------------------------------
UPDATE public.categories
SET icon = CASE icon
  WHEN '💰' THEN 'cash-multiple'
  WHEN '💵' THEN 'wallet-outline'
  WHEN '🏠' THEN 'home-outline'
  WHEN '🛒' THEN 'cart-outline'
  WHEN '🚗' THEN 'car-outline'
  WHEN '⛽' THEN 'gas-station-outline'
  WHEN '📱' THEN 'autorenew'
  WHEN '🎮' THEN 'gamepad-variant-outline'
  WHEN '🍽️' THEN 'silverware-fork-knife'
  WHEN '🍽' THEN 'silverware-fork-knife'
  WHEN '💊' THEN 'medical-bag'
  WHEN '🧾' THEN 'receipt-text-outline'
  WHEN '💸' THEN 'dots-horizontal-circle-outline'
  WHEN '💳' THEN 'credit-card-outline'
  ELSE icon
END
WHERE icon IS NOT NULL AND icon !~ '^[a-z0-9-]+$';

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
    (new_budget_id, 'Petites dépenses', 'expense', 'receipt-text-outline', '#A855F7'),
    (new_budget_id, 'Autre dépense', 'expense', 'dots-horizontal-circle-outline', '#64748B');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
