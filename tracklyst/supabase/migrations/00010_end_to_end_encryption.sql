-- ------------------------------------------------------------
-- Chiffrement de bout en bout des textes (notes, objectifs, abonnements,
-- noms de budgets et de comptes). Le serveur ne stocke que :
--  - user_keys   : clé publique X25519 + clé privée CHIFFRÉE (par le code
--                  secret et par la clé de secours, côté appareil)
--  - budget_keys : clé de chaque budget, emballée pour chaque membre
-- Il ne peut donc rien déchiffrer. Les montants restent en clair.
-- ------------------------------------------------------------

CREATE TABLE public.user_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  private_key_by_code TEXT NOT NULL,
  code_salt TEXT NOT NULL,
  private_key_by_recovery TEXT NOT NULL,
  recovery_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own keys"
  ON public.user_keys FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_keys_updated_at
  BEFORE UPDATE ON public.user_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Clés de budget emballées (une ligne par membre)
-- ------------------------------------------------------------
CREATE TABLE public.budget_keys (
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wrapped_key TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (budget_id, user_id)
);

ALTER TABLE public.budget_keys ENABLE ROW LEVEL SECURITY;

-- Le destinataire a-t-il accès au budget ? (propriétaire ou membre du groupe)
CREATE OR REPLACE FUNCTION public.is_budget_member(p_budget_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = p_budget_id
      AND (
        (b.owner_type = 'user' AND b.owner_id = p_user_id)
        OR (b.owner_type = 'group' AND EXISTS (
          SELECT 1 FROM public.group_members m WHERE m.group_id = b.owner_id AND m.user_id = p_user_id
        ))
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_budget_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_budget_member(UUID, UUID) TO authenticated;

CREATE POLICY "Users read their own budget keys"
  ON public.budget_keys FOR SELECT
  USING (user_id = auth.uid());

-- Un membre qui détient la clé peut l'emballer pour un autre membre du budget.
CREATE POLICY "Members share budget keys with members"
  ON public.budget_keys FOR INSERT
  WITH CHECK (
    public.can_access_budget(budget_id)
    AND public.is_budget_member(budget_id, user_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Users delete their own budget keys"
  ON public.budget_keys FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- budget_key_status : membres du budget, leur rôle, leur clé publique et
-- s'ils ont déjà la clé du budget. Seul le propriétaire crée la clé (évite
-- deux clés concurrentes) ; tout détenteur la transmet aux nouveaux membres.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.budget_key_status(p_budget_id UUID)
RETURNS TABLE (user_id UUID, role TEXT, public_key TEXT, has_key BOOLEAN) AS $$
BEGIN
  IF NOT public.can_access_budget(p_budget_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT b.owner_id AS uid, 'owner'::TEXT AS member_role FROM public.budgets b
    WHERE b.id = p_budget_id AND b.owner_type = 'user'
    UNION
    SELECT m.user_id, m.role FROM public.budgets b
    JOIN public.group_members m ON b.owner_type = 'group' AND m.group_id = b.owner_id
    WHERE b.id = p_budget_id
  )
  SELECT mb.uid,
         mb.member_role,
         k.public_key,
         EXISTS (SELECT 1 FROM public.budget_keys bk WHERE bk.budget_id = p_budget_id AND bk.user_id = mb.uid)
  FROM members mb
  LEFT JOIN public.user_keys k ON k.user_id = mb.uid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.budget_key_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.budget_key_status(UUID) TO authenticated;

-- ------------------------------------------------------------
-- Un membre retiré ou qui quitte perd aussi sa clé emballée.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_group_member_removed_drop_keys()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.budget_keys bk
  USING public.budgets b
  WHERE bk.budget_id = b.id
    AND b.owner_type = 'group'
    AND b.owner_id = OLD.group_id
    AND bk.user_id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER group_members_drop_budget_keys
  AFTER DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.on_group_member_removed_drop_keys();
