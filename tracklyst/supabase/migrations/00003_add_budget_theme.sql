-- ------------------------------------------------------------
-- Persist the color theme chosen at budget creation.
-- Previously the UI let the user pick a theme but discarded it,
-- then re-derived a color from the budget's position in the list
-- (unstable: shifts whenever the list order changes).
-- ------------------------------------------------------------
ALTER TABLE public.budgets
  ADD COLUMN theme TEXT NOT NULL DEFAULT 'emerald'
    CHECK (theme IN ('emerald', 'indigo', 'orange', 'cyan', 'rose', 'violet'));
