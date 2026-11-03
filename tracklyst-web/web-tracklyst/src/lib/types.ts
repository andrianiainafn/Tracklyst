// Types alignés sur le schéma Supabase partagé avec l'app mobile.

export type TxType = "income" | "expense";

export interface Budget {
  id: string;
  name: string;
  owner_type: "user" | "group";
  owner_id: string;
  currency: string;
  initial_amount: number | null;
  theme: string | null;
  /** Où se trouve l'argent : mobile_money, bank, savings, cash, other. */
  account_kind?: string | null;
  /** Nom libre : MVola, BNI Madagascar, Caisse d'Épargne… */
  account_name?: string | null;
}

export interface CategoryRef {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface Category extends CategoryRef {
  budget_id: string;
  type: TxType;
  monthly_limit: number | null;
}

export interface Transaction {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number;
  type: TxType;
  description: string | null;
  date: string; // YYYY-MM-DD
  is_recurring: boolean;
  recurring_rule_id: string | null;
  created_at: string;
  category?: CategoryRef;
}

export type GoalStatus = "in_progress" | "completed" | "cancelled" | "paused";

export interface Goal {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  color: string | null;
  status: GoalStatus;
}

export interface Subscription {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number;
  type: TxType;
  description: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  is_active: boolean;
  category?: CategoryRef;
}
