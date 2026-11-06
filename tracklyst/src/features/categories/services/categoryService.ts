import { supabase } from "@/src/lib/supabase";
import { DEFAULT_CATEGORIES } from "../constants/categoryPresets";
import type {
  Category,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from "../types/category.types";

export const categoryService = {
  async getCategories(budgetId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("budget_id", budgetId)
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Category[];
  },

  async createCategory(dto: CreateCategoryDTO): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async updateMonthlyLimit(
    id: string,
    monthlyLimit: number | null,
    period: "month" | "week" = "month",
  ): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .update({ monthly_limit: monthlyLimit, limit_period: period })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async updateCategory(id: string, dto: UpdateCategoryDTO): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .update(dto)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  /**
   * Ajoute les catégories par défaut absentes du budget (comparaison sur
   * le nom et le type). Retourne celles qui ont été créées.
   */
  async addDefaultCategories(
    budgetId: string,
    existing: Pick<Category, "name" | "type">[],
  ): Promise<Category[]> {
    const taken = new Set(existing.map((c) => `${c.type}:${c.name.toLowerCase()}`));
    const missing = DEFAULT_CATEGORIES.filter(
      (c) => !taken.has(`${c.type}:${c.name.toLowerCase()}`),
    ).map((c) => ({ ...c, budget_id: budgetId }));
    if (missing.length === 0) return [];

    const { data, error } = await supabase
      .from("categories")
      .insert(missing)
      .select();

    if (error) throw error;
    return data as Category[];
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
  },
};
