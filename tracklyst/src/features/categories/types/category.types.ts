export interface Category {
  id: string;
  budget_id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
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
