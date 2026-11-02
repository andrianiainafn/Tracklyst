import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Transaction } from "../types/transaction.types";

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  devtools(
    (set) => ({
      transactions: [],
      isLoading: false,
      error: null,

      setTransactions: (transactions) =>
        set({ transactions, isLoading: false, error: null }),

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        })),

      updateTransaction: (id, data) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...data } : t,
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      clearTransactions: () =>
        set({ transactions: [], error: null, isLoading: false }),
    }),
    { name: "TransactionStore" },
  ),
);
