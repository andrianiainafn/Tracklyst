import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { Budget, BudgetBalance } from "../types/budget.types";

interface BudgetState {
  budgets: Budget[];
  activeBudget: Budget | null;
  balance: BudgetBalance | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBudgets: (budgets: Budget[]) => void;
  setActiveBudget: (budget: Budget | null) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, data: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  setBalance: (balance: BudgetBalance | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearBudgets: () => void;
}

export const useBudgetStore = create<BudgetState>()(
  devtools(
    persist(
      (set) => ({
        budgets: [],
        activeBudget: null,
        balance: null,
        isLoading: false,
        error: null,

        setBudgets: (budgets) =>
          set({ budgets, isLoading: false, error: null }),

        setActiveBudget: (budget) => set({ activeBudget: budget }),

        addBudget: (budget) =>
          set((state) => ({
            budgets: [...state.budgets, budget],
            // Auto-select if it's the first one
            activeBudget:
              state.budgets.length === 0 ? budget : state.activeBudget,
          })),

        updateBudget: (id, data) =>
          set((state) => ({
            budgets: state.budgets.map((b) =>
              b.id === id ? { ...b, ...data } : b,
            ),
            activeBudget:
              state.activeBudget?.id === id
                ? { ...state.activeBudget, ...data }
                : state.activeBudget,
          })),

        deleteBudget: (id) =>
          set((state) => {
            const remaining = state.budgets.filter((b) => b.id !== id);
            const activeStillExists = remaining.some(
              (b) => b.id === state.activeBudget?.id,
            );
            return {
              budgets: remaining,
              activeBudget: activeStillExists
                ? state.activeBudget
                : (remaining[0] ?? null),
            };
          }),

        setBalance: (balance) => set({ balance }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error, isLoading: false }),

        clearBudgets: () =>
          set({
            budgets: [],
            activeBudget: null,
            balance: null,
            error: null,
            isLoading: false,
          }),
      }),
      {
        name: "budget-storage",
        // ✅ Use AsyncStorage instead of localStorage (not available in RN)
        storage: createJSONStorage(() => AsyncStorage),
        // Only persist the active budget to avoid stale data
        partialize: (state) => ({ activeBudget: state.activeBudget }),
      },
    ),
  ),
);
