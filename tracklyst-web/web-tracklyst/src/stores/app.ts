"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  errorMessage,
  getAccountBalances,
  getAccounts,
  getAvailableBalance,
  getBudgets,
  getCategories,
  getGoals,
  getMonthSaved,
  getSubscriptions,
  getTransactions,
} from "@/lib/data";
import { monthRange } from "@/lib/format";
import type { Account, Budget, Category, Goal, Subscription, Transaction } from "@/lib/types";

interface AppState {
  /** Budget choisi (persisté sur l'appareil). */
  activeBudgetId: string | null;
  /** Soldes masqués — volontairement non persisté : masqué à chaque ouverture. */
  hidden: boolean;

  budgets: Budget[];
  balance: number;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  subscriptions: Subscription[];
  savedThisMonth: number;
  /** Comptes du budget actif (archivés compris) et solde de chacun ; « none » = sans compte. */
  accounts: Account[];
  accountBalances: Record<string, number>;

  loading: boolean;
  loaded: boolean;
  error: string | null;

  toggleHidden: () => void;
  selectBudget: (id: string) => Promise<void>;
  /** Recharge tout le budget actif (après chaque modification). */
  refresh: () => Promise<void>;
  reset: () => void;
}

const EMPTY = {
  budgets: [],
  balance: 0,
  categories: [],
  transactions: [],
  goals: [],
  subscriptions: [],
  savedThisMonth: 0,
  accounts: [],
  accountBalances: {},
  loaded: false,
  error: null,
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      activeBudgetId: null,
      hidden: true,
      ...EMPTY,
      loading: false,

      toggleHidden: () => set((s) => ({ hidden: !s.hidden })),

      selectBudget: async (id) => {
        set({ activeBudgetId: id });
        await get().refresh();
      },

      refresh: async () => {
        set({ loading: true });
        try {
          const budgets = await getBudgets();
          const active =
            budgets.find((b) => b.id === get().activeBudgetId) ?? budgets[0] ?? null;
          if (!active) {
            set({ ...EMPTY, budgets, loaded: true, loading: false, activeBudgetId: null });
            return;
          }
          const { start, end } = monthRange();
          const [balance, categories, transactions, goals, subscriptions, savedThisMonth, accounts, accountBalances] =
            await Promise.all([
              getAvailableBalance(active.id),
              getCategories(active.id),
              getTransactions(active.id),
              getGoals(active.id),
              getSubscriptions(active.id),
              getMonthSaved(active.id, start, end),
              getAccounts(active.id),
              getAccountBalances(active.id),
            ]);
          set({
            activeBudgetId: active.id,
            budgets,
            balance,
            categories,
            transactions,
            goals,
            subscriptions,
            savedThisMonth,
            accounts,
            accountBalances,
            loaded: true,
            loading: false,
            error: null,
          });
        } catch (err) {
          set({ loading: false, loaded: true, error: errorMessage(err, "Erreur de chargement") });
        }
      },

      reset: () => set({ ...EMPTY, activeBudgetId: null, hidden: true }),
    }),
    {
      name: "tracklyst-web",
      partialize: (s) => ({ activeBudgetId: s.activeBudgetId }),
    },
  ),
);

export const useActiveBudget = () =>
  useApp((s) => s.budgets.find((b) => b.id === s.activeBudgetId) ?? null);
