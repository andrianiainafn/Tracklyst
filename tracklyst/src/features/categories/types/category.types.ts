export interface Category {
  id: string;
  budget_id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  /** Plafond de dépense par mois. null = pas de plafond. */
  monthly_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryDTO {
  budget_id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
}
