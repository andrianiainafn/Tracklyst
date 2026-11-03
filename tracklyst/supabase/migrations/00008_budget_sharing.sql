-- ------------------------------------------------------------
-- Partage d'un budget entre plusieurs comptes, par code d'invitation.
--
--  - share_budget(budget)     : le propriétaire obtient un code (6 caractères).
--    Au premier partage, le budget personnel devient un budget de groupe
--    (nouveau groupe dont il est propriétaire) : aucune donnée ne bouge.
--  - join_budget(code)        : l'autre compte rejoint le budget (rôle membre).
--  - budget_members(budget)   : liste des membres.
--  - remove_budget_member     : le propriétaire retire un membre.
--  - leave_budget             : un membre quitte le budget.
--
-- Tous les membres ont les mêmes droits sur le contenu du budget
-- (transactions, catégories, objectifs, abonnements) via les politiques
-- existantes. Seul le propriétaire gère les membres et le code.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Aides (SECURITY DEFINER : lisent group_members sans passer par sa RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.group_role(p_group_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.group_members
  WHERE group_id = p_group_id AND user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_budget(p_budget_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = p_budget_id
      AND (
        (b.owner_type = 'user' AND b.owner_id = auth.uid())
        OR (b.owner_type = 'group' AND public.group_role(b.owner_id) IS NOT NULL)
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.group_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_budget(UUID) TO authenticated;

-- ------------------------------------------------------------
-- Politiques GROUP_MEMBERS / GROUPS : sans auto-référence
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid() OR public.group_role(group_id) IS NOT NULL);

DROP POLICY IF EXISTS "Owners and admins can insert members" ON public.group_members;
CREATE POLICY "Owners and admins can insert members"
  ON public.group_members FOR INSERT
  WITH CHECK (public.group_role(group_id) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Owners and admins can update members" ON public.group_members;
CREATE POLICY "Owners and admins can update members"
  ON public.group_members FOR UPDATE
  USING (public.group_role(group_id) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Owners and admins can delete members, or user can leave" ON public.group_members;
CREATE POLICY "Owners and admins can delete members, or user can leave"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid() OR public.group_role(group_id) IN ('owner', 'admin'));

-- auth.users n'est pas lisible par les utilisateurs : on lit l'e-mail du jeton.
DROP POLICY IF EXISTS "Invitees can view invitations sent to their email" ON public.group_invitations;
CREATE POLICY "Invitees can view invitations sent to their email"
  ON public.group_invitations FOR SELECT
  USING (email = auth.jwt() ->> 'email' OR invited_by = auth.uid());

DROP POLICY IF EXISTS "Inviter or invitee can update (accept/decline)" ON public.group_invitations;
CREATE POLICY "Inviter or invitee can update (accept/decline)"
  ON public.group_invitations FOR UPDATE
  USING (invited_by = auth.uid() OR email = auth.jwt() ->> 'email');

-- ------------------------------------------------------------
-- Codes de partage (accès uniquement via les fonctions ci-dessous)
-- ------------------------------------------------------------
CREATE TABLE public.budget_share_codes (
  code TEXT PRIMARY KEY,
  budget_id UUID NOT NULL UNIQUE REFERENCES public.budgets(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.budget_share_codes ENABLE ROW LEVEL SECURITY;

-- 6 caractères sans les signes ambigus (0/O, 1/I/L).
CREATE OR REPLACE FUNCTION public.new_share_code()
RETURNS TEXT AS $$
DECLARE
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code TEXT;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.budget_share_codes WHERE code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.new_share_code() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- share_budget : code du budget (créé si besoin, renouvelé si p_renew)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.share_budget(p_budget_id UUID, p_renew BOOLEAN DEFAULT FALSE)
RETURNS TEXT AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_budget public.budgets%ROWTYPE;
  v_group_id UUID;
  v_code TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_budget FROM public.budgets WHERE id = p_budget_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget_not_found';
  END IF;

  IF v_budget.owner_type = 'user' THEN
    IF v_budget.owner_id <> v_uid THEN
      RAISE EXCEPTION 'not_owner';
    END IF;
    -- Premier partage : le budget passe sous un groupe dont l'utilisateur est propriétaire.
    INSERT INTO public.groups (name, created_by)
    VALUES (v_budget.name, v_uid)
    RETURNING id INTO v_group_id;
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_group_id, v_uid, 'owner');
    UPDATE public.budgets SET owner_type = 'group', owner_id = v_group_id WHERE id = p_budget_id;
  ELSIF public.group_role(v_budget.owner_id) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF p_renew THEN
    DELETE FROM public.budget_share_codes WHERE budget_id = p_budget_id;
  END IF;

  SELECT code INTO v_code FROM public.budget_share_codes WHERE budget_id = p_budget_id;
  IF v_code IS NULL THEN
    v_code := public.new_share_code();
    INSERT INTO public.budget_share_codes (code, budget_id, created_by)
    VALUES (v_code, p_budget_id, v_uid);
  END IF;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- join_budget : rejoindre avec un code ; retourne l'id du budget
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_budget(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_budget_id UUID;
  v_group_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT s.budget_id, b.owner_id INTO v_budget_id, v_group_id
  FROM public.budget_share_codes s
  JOIN public.budgets b ON b.id = s.budget_id AND b.owner_type = 'group'
  WHERE s.code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  IF v_budget_id IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_uid, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_budget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- budget_members : membres d'un budget partagé (visible des membres)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.budget_members(p_budget_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, email TEXT, role TEXT, joined_at TIMESTAMPTZ, is_me BOOLEAN) AS $$
BEGIN
  IF NOT public.can_access_budget(p_budget_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT m.user_id,
         coalesce(nullif(p.display_name, ''), split_part(coalesce(p.email, u.email), '@', 1)),
         coalesce(p.email, u.email)::TEXT,
         m.role,
         m.joined_at,
         m.user_id = auth.uid()
  FROM public.budgets b
  JOIN public.group_members m ON b.owner_type = 'group' AND m.group_id = b.owner_id
  LEFT JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE b.id = p_budget_id
  ORDER BY (m.role = 'owner') DESC, m.joined_at;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- remove_budget_member : le propriétaire retire un membre
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_budget_member(p_budget_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT owner_id INTO v_group_id FROM public.budgets
  WHERE id = p_budget_id AND owner_type = 'group';
  IF v_group_id IS NULL OR public.group_role(v_group_id) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_remove_self';
  END IF;
  DELETE FROM public.group_members WHERE group_id = v_group_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- leave_budget : un membre quitte (le propriétaire doit d'abord retirer les autres)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_budget(p_budget_id UUID)
RETURNS VOID AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT owner_id INTO v_group_id FROM public.budgets
  WHERE id = p_budget_id AND owner_type = 'group';
  IF v_group_id IS NULL OR public.group_role(v_group_id) IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF public.group_role(v_group_id) = 'owner' THEN
    RAISE EXCEPTION 'owner_cannot_leave';
  END IF;
  DELETE FROM public.group_members WHERE group_id = v_group_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.share_budget(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_budget(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.budget_members(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_budget_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_budget(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_budget(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_budget(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_budget_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_budget(UUID) TO authenticated;

-- ------------------------------------------------------------
-- get_budget_stats : uniquement pour les budgets accessibles
-- (SECURITY DEFINER : sans ce contrôle, tout compte connecté pouvait lire
-- les totaux d'un budget dont il connaît l'id)
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
  IF NOT public.can_access_budget(p_budget_id) THEN
    RETURN;
  END IF;

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
