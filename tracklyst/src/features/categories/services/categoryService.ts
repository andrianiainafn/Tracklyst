import { supabase } from "@/src/lib/supabase";
import type { Category, CreateCategoryDTO } from "../types/category.types";

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

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
  },
};
