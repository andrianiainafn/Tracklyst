export type LimitPeriod = "month" | "week";

export interface Category {
  id: string;
  budget_id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  /** Plafond de dépense par mois. null = pas de plafond. */
  monthly_limit: number | null;
  /** Période du plafond : par mois (défaut) ou par semaine, du lundi au dimanche. */
  limit_period?: LimitPeriod | null;
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

export type UpdateCategoryDTO = Partial<Pick<Category, "name" | "icon" | "color">>;
