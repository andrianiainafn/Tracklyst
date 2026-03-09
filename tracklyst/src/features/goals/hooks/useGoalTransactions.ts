import { useEffect } from "react";
import { goalService } from "../services/goalService";
import { useGoalStore } from "../store/goalStore";
import type {
  CreateGoalTransactionDTO,
  GoalTransaction,
} from "../types/goal.types";

export const useGoalTransactions = (goalId?: string) => {
  const {
    goalTransactions,
    isLoading,
    error,
    setGoalTransactions,
    setLoading,
    setError,
    addGoalTransaction,
  } = useGoalStore();

  useEffect(() => {
    if (!goalId) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await goalService.getGoalTransactions(goalId);
        setGoalTransactions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur de chargement des mouvements d'objectif",
        );
      }
    };

    load();
  }, [goalId]);

  const create = async (
    dto: Omit<CreateGoalTransactionDTO, "goal_id">,
  ): Promise<GoalTransaction> => {
    if (!goalId) {
      throw new Error("Aucun objectif sélectionné");
    }
    try {
      setLoading(true);
      const created = await goalService.createGoalTransaction({
        ...dto,
        goal_id: goalId,
      });
      addGoalTransaction(created);
      return created;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement du mouvement";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    goalTransactions,
    isLoading,
    error,
    create,
  };
};

