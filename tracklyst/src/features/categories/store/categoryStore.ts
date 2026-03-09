import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Category } from "../types/category.types";

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCategoryStore = create<CategoryState>()(
  devtools(
    (set) => ({
      categories: [],
      isLoading: false,
      error: null,

      setCategories: (categories) =>
        set({ categories, isLoading: false, error: null }),

      addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, category] })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
    }),
    { name: "CategoryStore" }
  )
);
