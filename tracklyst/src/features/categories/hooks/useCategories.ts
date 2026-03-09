import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useEffect } from "react";
import { categoryService } from "../services/categoryService";
import { useCategoryStore } from "../store/categoryStore";

/**
 * Charge les catégories du budget spécifié, ou du budget actif par défaut.
 * @param budgetId - ID du budget à charger (optionnel, fallback sur activeBudget)
 */
export const useCategories = (budgetId?: string) => {
  const { categories, isLoading, error, setCategories, setLoading, setError } =
    useCategoryStore();
  const { activeBudget } = useBudgetStore();

  // Priorité : budgetId passé en param > activeBudget du store
  const targetBudgetId = budgetId ?? activeBudget?.id;

  useEffect(() => {
    if (!targetBudgetId) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await categoryService.getCategories(targetBudgetId);
        setCategories(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur de chargement des catégories",
        );
      }
    };

    load();
  }, [targetBudgetId]);

  return { categories, isLoading, error };
};
