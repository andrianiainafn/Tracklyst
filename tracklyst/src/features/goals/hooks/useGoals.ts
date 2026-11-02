import { useEffect } from "react";
import { useBudgetStore } from "../../budgets/store/budgetStore";
import { goalService } from "../services/goalService";
import { useGoalStore } from "../store/goalStore";
import type { CreateGoalDTO, UpdateGoalDTO } from "../types/goal.types";

export const useGoals = () => {
  const {
    goals,
    isLoading,
    error,
    setGoals,
    setLoading,
    setError,
    addGoal,
    updateGoal,
    deleteGoal,
  } = useGoalStore();

  const { activeBudget } = useBudgetStore();

  useEffect(() => {
    if (!activeBudget?.id) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await goalService.getGoals(activeBudget.id);
        setGoals(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur de chargement des objectifs",
        );
      }
    };

    load();
  }, [activeBudget?.id]);

  const create = async (dto: Omit<CreateGoalDTO, "budget_id">) => {
    if (!activeBudget?.id) throw new Error("Aucun budget actif");
    try {
      setLoading(true);
      const created = await goalService.createGoal({
        ...dto,
        budget_id: activeBudget.id,
      });
      addGoal(created);
      return created;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de la création";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, dto: UpdateGoalDTO) => {
    try {
      setLoading(true);
      const updated = await goalService.updateGoal(id, dto);
      updateGoal(id, updated);
      return updated;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setLoading(true);
      await goalService.deleteGoal(id);
      deleteGoal(id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    goals,
    isLoading,
    error,
    create,
    update,
    remove,
  };
};

