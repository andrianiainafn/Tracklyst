// ─── Core entity ──────────────────────────────────────────────────────────────
export interface Transaction {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  date: string; // ISO date string "YYYY-MM-DD"
  is_recurring: boolean;
  recurring_rule_id: string | null;
  created_by: string | null;
  created_at: string;

  // Joined relation
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateTransactionDTO {
  budget_id: string;
  category_id: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  date: string;
  is_recurring?: boolean;
  recurring_rule_id?: string;
}

export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

// ─── Filters / UI ─────────────────────────────────────────────────────────────
export type TransactionFilter = 'all' | 'income' | 'expense';

export interface TransactionGroup {
  date: string;
  items: Transaction[];
}
