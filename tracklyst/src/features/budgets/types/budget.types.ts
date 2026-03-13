// ─── Core entity ──────────────────────────────────────────────────────────────
export interface Budget {
  id: string;
  name: string;
  owner_type: 'user' | 'group';
  owner_id: string;
  currency: string;
  initial_amount?: number;
  created_at: string;
  updated_at: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateBudgetDTO {
  name: string;
  owner_type: 'user' | 'group';
  owner_id: string;
  currency?: string;
  initial_amount?: number;
}

export type UpdateBudgetDTO = Partial<Pick<Budget, 'name' | 'currency'>>;

// ─── Balance (calculated view) ────────────────────────────────────────────────
export interface BudgetBalance {
  total_balance: number;
  available_balance: number;
  locked_in_goals: number;
}
