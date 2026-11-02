// ─── Core entity (table recurring_rules) ──────────────────────────────────────
export type SubscriptionFrequency = "weekly" | "monthly" | "yearly";

export interface Subscription {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  frequency: SubscriptionFrequency | "daily";
  interval: number;
  start_date: string; // "YYYY-MM-DD" — son jour sert d'ancre pour les mois courts
  end_date: string | null;
  next_occurrence: string; // "YYYY-MM-DD"
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Joined relation
  category?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateSubscriptionDTO {
  budget_id: string;
  category_id: string;
  amount: number;
  description: string;
  frequency: SubscriptionFrequency;
  start_date: string;
}

export type UpdateSubscriptionDTO = Partial<
  Pick<
    Subscription,
    | "amount"
    | "description"
    | "category_id"
    | "frequency"
    | "start_date"
    | "next_occurrence"
    | "is_active"
  >
>;
