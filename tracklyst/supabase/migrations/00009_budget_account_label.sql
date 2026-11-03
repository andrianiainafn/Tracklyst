-- ------------------------------------------------------------
-- Étiquette « où est l'argent » d'un budget : MVola, banque, épargne…
--  - account_kind : famille (icône et couleur côté app)
--  - account_name : nom libre (MVola, BNI Madagascar, Caisse d'Épargne…)
-- Colonnes facultatives : les budgets existants restent sans étiquette.
-- ------------------------------------------------------------
ALTER TABLE public.budgets
  ADD COLUMN account_kind TEXT
    CHECK (account_kind IN ('mobile_money', 'bank', 'savings', 'cash', 'other')),
  ADD COLUMN account_name TEXT
    CHECK (account_name IS NULL OR char_length(account_name) <= 60);
