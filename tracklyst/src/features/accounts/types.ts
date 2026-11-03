/** Compte d'un budget : MVola, BNI, espèces… (nom chiffré de bout en bout). */
export interface Account {
  id: string;
  budget_id: string;
  kind: string;
  name: string | null;
  initial_amount: number;
  position: number;
  is_archived: boolean;
}

export interface Transfer {
  id: string;
  budget_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}
