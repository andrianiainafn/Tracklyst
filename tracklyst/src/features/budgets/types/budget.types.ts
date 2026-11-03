// ─── Core entity ──────────────────────────────────────────────────────────────
export interface Budget {
  id: string;
  name: string;
  owner_type: 'user' | 'group';
  owner_id: string;
  currency: string;
  initial_amount?: number;
  theme?: string;
  /** Où se trouve l'argent : mobile_money, bank, savings, cash, other. */
  account_kind?: string | null;
  /** Nom libre : MVola, BNI Madagascar, Caisse d'Épargne… */
  account_name?: string | null;
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
  theme?: string;
}

export type UpdateBudgetDTO = Partial<
  Pick<Budget, 'name' | 'currency' | 'theme' | 'initial_amount' | 'account_kind' | 'account_name'>
>;

// ─── Balance (calculated view) ────────────────────────────────────────────────
export interface BudgetBalance {
  total_balance: number;
  available_balance: number;
  locked_in_goals: number;
}
