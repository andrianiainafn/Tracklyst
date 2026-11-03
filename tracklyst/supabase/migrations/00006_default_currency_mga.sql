-- ------------------------------------------------------------
-- Devise par défaut : Ariary (MGA) au lieu de l'euro.
-- handle_new_user crée désormais « Mon Budget » en MGA (cf. 00005).
-- ------------------------------------------------------------
ALTER TABLE public.budgets ALTER COLUMN currency SET DEFAULT 'MGA';

-- Le budget créé automatiquement à l'inscription était en EUR sans
-- que l'utilisateur l'ait choisi : on le repasse en Ariary. Les
-- montants ne sont pas convertis (ils ont été saisis en Ariary).
-- Les budgets créés manuellement en EUR ne sont pas touchés.
UPDATE public.budgets
SET currency = 'MGA'
WHERE name = 'Mon Budget' AND owner_type = 'user' AND currency = 'EUR';
