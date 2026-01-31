-- ============================================================
-- TRACKLYST - Schéma initial (MVP)
-- À exécuter dans l’ordre dans Supabase SQL Editor
-- ou via: supabase db push
-- ============================================================

-- Extension UUID (souvent déjà activée sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES (extension optionnelle de auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- GROUPS
-- ------------------------------------------------------------
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- GROUP_MEMBERS
-- ------------------------------------------------------------
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);

-- ------------------------------------------------------------
-- BUDGETS
-- owner_type: 'user' | 'group'
-- owner_id: id du user (auth.users) ou du group selon owner_type
-- ------------------------------------------------------------
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'group')),
  owner_id UUID NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budgets_owner ON public.budgets(owner_type, owner_id);

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_budget_id ON public.categories(budget_id);

-- ------------------------------------------------------------
-- RECURRING_RULES
-- ------------------------------------------------------------
CREATE TABLE public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_rules_budget_id ON public.recurring_rules(budget_id);
CREATE INDEX idx_recurring_rules_next ON public.recurring_rules(next_occurrence) WHERE is_active = true;

-- ------------------------------------------------------------
-- TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_budget_id ON public.transactions(budget_id);
CREATE INDEX idx_transactions_date ON public.transactions(budget_id, date);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);

-- ------------------------------------------------------------
-- GOALS
-- ------------------------------------------------------------
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  deadline DATE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon TEXT,
  color TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled', 'paused')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_budget_id ON public.goals(budget_id);

-- ------------------------------------------------------------
-- GOAL_TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE public.goal_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  description TEXT,
  date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goal_transactions_goal_id ON public.goal_transactions(goal_id);
CREATE INDEX idx_goal_transactions_budget_id ON public.goal_transactions(budget_id);

-- ------------------------------------------------------------
-- BALANCES (snapshot par budget par date)
-- ------------------------------------------------------------
CREATE TABLE public.balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  total_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  available_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  locked_in_goals DECIMAL(12, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(budget_id, date)
);

CREATE INDEX idx_balances_budget_date ON public.balances(budget_id, date);

-- ------------------------------------------------------------
-- GROUP_INVITATIONS
-- ------------------------------------------------------------
CREATE TABLE public.group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_invitations_token ON public.group_invitations(invitation_token);
CREATE INDEX idx_group_invitations_group_id ON public.group_invitations(group_id);
CREATE INDEX idx_group_invitations_email ON public.group_invitations(email);

-- Contrainte : pas de doublon d'invitation pending
CREATE UNIQUE INDEX idx_unique_pending_invitation
  ON public.group_invitations(group_id, email)
  WHERE status = 'pending';

-- ------------------------------------------------------------
-- LOANS_GIVEN
-- ------------------------------------------------------------
CREATE TABLE public.loans_given (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  amount_returned DECIMAL(12, 2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(5, 2),
  loan_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'partially_paid', 'fully_paid', 'defaulted')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loans_given_budget_id ON public.loans_given(budget_id);

-- ------------------------------------------------------------
-- LOANS_RECEIVED
-- ------------------------------------------------------------
CREATE TABLE public.loans_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  lender_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(5, 2),
  loan_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'partially_paid', 'fully_paid')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loans_received_budget_id ON public.loans_received(budget_id);

-- ------------------------------------------------------------
-- LOAN_PAYMENTS (versements pour prêts donnés ou reçus)
-- ------------------------------------------------------------
CREATE TABLE public.loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_given_id UUID REFERENCES public.loans_given(id) ON DELETE CASCADE,
  loan_received_id UUID REFERENCES public.loans_received(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT loan_payments_one_loan CHECK (
    (loan_given_id IS NOT NULL AND loan_received_id IS NULL) OR
    (loan_given_id IS NULL AND loan_received_id IS NOT NULL)
  )
);

CREATE INDEX idx_loan_payments_given ON public.loan_payments(loan_given_id);
CREATE INDEX idx_loan_payments_received ON public.loan_payments(loan_received_id);

-- ------------------------------------------------------------
-- RLS (Row Level Security) - activer sur toutes les tables
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans_given ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Politiques RLS - PROFILES
-- ------------------------------------------------------------
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- Politiques RLS - GROUPS
-- ------------------------------------------------------------
CREATE POLICY "Users can view groups they belong to"
  ON public.groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update group"
  ON public.groups FOR UPDATE
  USING (
    id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete group"
  ON public.groups FOR DELETE
  USING (
    id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ------------------------------------------------------------
-- Politiques RLS - GROUP_MEMBERS
-- ------------------------------------------------------------
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners and admins can insert members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update members"
  ON public.group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete members, or user can leave"
  ON public.group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------
-- Politiques RLS - BUDGETS
-- ------------------------------------------------------------
CREATE POLICY "Users can view own or group budgets"
  ON public.budgets FOR SELECT
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR
    (owner_type = 'group' AND owner_id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create personal or group budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR
    (owner_type = 'group' AND owner_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );

CREATE POLICY "Users can update own or group budgets they manage"
  ON public.budgets FOR UPDATE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR
    (owner_type = 'group' AND owner_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );

CREATE POLICY "Users can delete own budgets, owners can delete group budgets"
  ON public.budgets FOR DELETE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR
    (owner_type = 'group' AND owner_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    ))
  );

-- ------------------------------------------------------------
-- Politiques RLS - CATEGORIES (même règle que budgets)
-- ------------------------------------------------------------
CREATE POLICY "Users can view categories of accessible budgets"
  ON public.categories FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can manage categories of accessible budgets"
  ON public.categories FOR ALL
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

-- ------------------------------------------------------------
-- Politiques RLS - TRANSACTIONS
-- ------------------------------------------------------------
CREATE POLICY "Users can view transactions of accessible budgets"
  ON public.transactions FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can insert transactions in accessible budgets"
  ON public.transactions FOR INSERT
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can update transactions of accessible budgets"
  ON public.transactions FOR UPDATE
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can delete transactions of accessible budgets"
  ON public.transactions FOR DELETE
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

-- ------------------------------------------------------------
-- Politiques RLS - GOALS, GOAL_TRANSACTIONS, BALANCES
-- ------------------------------------------------------------
CREATE POLICY "Users can view goals of accessible budgets"
  ON public.goals FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can manage goals of accessible budgets"
  ON public.goals FOR ALL
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can view goal_transactions of accessible budgets"
  ON public.goal_transactions FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can insert goal_transactions in accessible budgets"
  ON public.goal_transactions FOR INSERT
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can view balances of accessible budgets"
  ON public.balances FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can insert/update balances of accessible budgets"
  ON public.balances FOR ALL
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

-- ------------------------------------------------------------
-- Politiques RLS - RECURRING_RULES
-- ------------------------------------------------------------
CREATE POLICY "Users can view recurring_rules of accessible budgets"
  ON public.recurring_rules FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can manage recurring_rules of accessible budgets"
  ON public.recurring_rules FOR ALL
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

-- ------------------------------------------------------------
-- Politiques RLS - GROUP_INVITATIONS
-- ------------------------------------------------------------
CREATE POLICY "Invitees can view invitations sent to their email"
  ON public.group_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
  );

CREATE POLICY "Owners and admins can create invitations"
  ON public.group_invitations FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Inviter or invitee can update (accept/decline)"
  ON public.group_invitations FOR UPDATE
  USING (invited_by = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ------------------------------------------------------------
-- Politiques RLS - LOANS_GIVEN, LOANS_RECEIVED, LOAN_PAYMENTS
-- ------------------------------------------------------------
CREATE POLICY "Users can view loans of accessible budgets"
  ON public.loans_given FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can manage loans_given of accessible budgets"
  ON public.loans_given FOR ALL
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can view loans_received of accessible budgets"
  ON public.loans_received FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can manage loans_received of accessible budgets"
  ON public.loans_received FOR ALL
  USING (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can view loan_payments for their loans"
  ON public.loan_payments FOR SELECT
  USING (
    loan_given_id IN (SELECT id FROM public.loans_given WHERE budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    ))
    OR
    loan_received_id IN (SELECT id FROM public.loans_received WHERE budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    ))
  );

CREATE POLICY "Users can manage loan_payments for their loans"
  ON public.loan_payments FOR ALL
  USING (
    loan_given_id IN (SELECT id FROM public.loans_given WHERE budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    ))
    OR
    loan_received_id IN (SELECT id FROM public.loans_received WHERE budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    ))
  )
  WITH CHECK (
    loan_given_id IN (SELECT id FROM public.loans_given WHERE budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    ))
    OR
    loan_received_id IN (SELECT id FROM public.loans_received WHERE budget_id IN (
      SELECT id FROM public.budgets
      WHERE (owner_type = 'user' AND owner_id = auth.uid())
         OR (owner_type = 'group' AND owner_id IN (
           SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
         ))
    ))
  );

-- ------------------------------------------------------------
-- Fonction updated_at automatique
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_rules_updated_at
  BEFORE UPDATE ON public.recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Trigger: creation user + budget personnel + categories par defaut
-- ------------------------------------------------------------
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
    (new_budget_id, 'Abonnements', 'expense', '📱', '#8B5CF6'),
    (new_budget_id, 'Loisirs', 'expense', '🎮', '#EC4899'),
    (new_budget_id, 'Restaurant', 'expense', '🍽️', '#F97316'),
    (new_budget_id, 'Santé', 'expense', '💊', '#06B6D4'),
    (new_budget_id, 'Autre dépense', 'expense', '💸', '#6B7280');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Décommenter si tu veux créer le profil automatiquement à l’inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- Fonction calcul du balance
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_balance(p_budget_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_balance DECIMAL(12, 2),
  available_balance DECIMAL(12, 2),
  locked_in_goals DECIMAL(12, 2)
) AS $$
DECLARE
  v_total_income DECIMAL(12, 2);
  v_total_expense DECIMAL(12, 2);
  v_locked_goals DECIMAL(12, 2);
BEGIN
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
    v_total_income - v_total_expense,
    (v_total_income - v_total_expense) - v_locked_goals,
    v_locked_goals;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Fonction generation des transactions recurrentes (CRON)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_recurring_transactions()
RETURNS INTEGER AS $$
DECLARE
  v_rule RECORD;
  v_new_next_occurrence DATE;
  v_count INTEGER := 0;
BEGIN
  FOR v_rule IN
    SELECT * FROM public.recurring_rules
    WHERE is_active = true AND next_occurrence <= CURRENT_DATE
  LOOP
    INSERT INTO public.transactions (
      budget_id,
      category_id,
      amount,
      type,
      description,
      date,
      is_recurring,
      recurring_rule_id
    ) VALUES (
      v_rule.budget_id,
      v_rule.category_id,
      v_rule.amount,
      v_rule.type,
      v_rule.description,
      v_rule.next_occurrence,
      true,
      v_rule.id
    );

    v_new_next_occurrence := (CASE v_rule.frequency
      WHEN 'daily' THEN (v_rule.next_occurrence + (v_rule.interval || ' days')::INTERVAL)::DATE
      WHEN 'weekly' THEN (v_rule.next_occurrence + (v_rule.interval || ' weeks')::INTERVAL)::DATE
      WHEN 'monthly' THEN (v_rule.next_occurrence + (v_rule.interval || ' months')::INTERVAL)::DATE
      WHEN 'yearly' THEN (v_rule.next_occurrence + (v_rule.interval || ' years')::INTERVAL)::DATE
    END)::DATE;

    UPDATE public.recurring_rules
    SET next_occurrence = v_new_next_occurrence
    WHERE id = v_rule.id;

    IF v_rule.end_date IS NOT NULL AND v_new_next_occurrence > v_rule.end_date THEN
      UPDATE public.recurring_rules SET is_active = false WHERE id = v_rule.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
