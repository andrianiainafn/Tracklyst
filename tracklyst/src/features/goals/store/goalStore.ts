import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Goal, GoalTransaction } from "../types/goal.types";

interface GoalState {
  goals: Goal[];
  goalTransactions: GoalTransaction[];
  isLoading: boolean;
  error: string | null;

  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, data: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  setGoalTransactions: (items: GoalTransaction[]) => void;
  addGoalTransaction: (tx: GoalTransaction) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useGoalStore = create<GoalState>()(
  devtools(
    (set) => ({
      goals: [],
      goalTransactions: [],
      isLoading: false,
      error: null,

      setGoals: (goals) => set({ goals, isLoading: false, error: null }),
      addGoal: (goal) =>
        set((state) => ({ goals: [goal, ...state.goals] })),
      updateGoal: (id, data) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, ...data } : g,
          ),
        })),
      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),

      setGoalTransactions: (items) =>
        set({ goalTransactions: items, isLoading: false, error: null }),
      addGoalTransaction: (tx) =>
        set((state) => ({
          goalTransactions: [tx, ...state.goalTransactions],
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      clear: () =>
        set({
          goals: [],
          goalTransactions: [],
          isLoading: false,
          error: null,
        }),
    }),
    { name: "GoalStore" },
  ),
);

