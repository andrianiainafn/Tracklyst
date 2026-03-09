import { useEffect } from "react";
import { budgetService } from "../../budgets/services/budgetService";
import { useBudgetStore } from "../../budgets/store/budgetStore";
import { transactionService } from "../services/transactionService";
import { useTransactionStore } from "../store/transactionStore";
import {
  CreateTransactionDTO,
  UpdateTransactionDTO,
} from "../types/transaction.types";

/**
 * Primary hook for the transactions tab.
 * Automatically loads transactions for the active budget on mount.
 */
export const useTransactions = () => {
  const {
    transactions,
    isLoading,
    error,
    setTransactions,
    setLoading,
    setError,
  } = useTransactionStore();

  const { activeBudget } = useBudgetStore();

  // ── Load on mount / when activeBudget changes ────────────────────────────
  useEffect(() => {
    if (!activeBudget?.id) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await transactionService.getTransactions(activeBudget.id);
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      }
    };

    load();
  }, [activeBudget?.id]);

  // ── Add ──────────────────────────────────────────────────────────────────
  const addTransaction = async (dto: CreateTransactionDTO) => {
    try {
      setLoading(true);
      const created = await transactionService.createTransaction(dto);
      useTransactionStore.getState().addTransaction(created);
      // Recalculer le solde du budget concerné par la transaction ajoutée
      const { activeBudget, setBalance } = useBudgetStore.getState();
      const budgetId = created.budget_id;
      const balance = await budgetService.getBalance(budgetId);
      if (activeBudget?.id === budgetId) {
        setBalance(balance);
      }
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const updateTransaction = async (id: string, dto: UpdateTransactionDTO) => {
    try {
      setLoading(true);
      const updated = await transactionService.updateTransaction(id, dto);
      useTransactionStore.getState().updateTransaction(id, updated);
      // Recalculer le solde du budget concerné par la transaction modifiée
      const { activeBudget, setBalance } = useBudgetStore.getState();
      const budgetId = updated.budget_id;
      const balance = await budgetService.getBalance(budgetId);
      if (activeBudget?.id === budgetId) {
        setBalance(balance);
      }
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

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteTransaction = async (id: string) => {
    try {
      setLoading(true);
      await transactionService.deleteTransaction(id);
      useTransactionStore.getState().deleteTransaction(id);

      const { activeBudget, setBalance } = useBudgetStore.getState();
      if (activeBudget?.id) {
        const balance = await budgetService.getBalance(activeBudget.id);
        setBalance(balance);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Refresh (re-fetch) ────────────────────────────────────────────────────
  const refresh = async () => {
    if (!activeBudget?.id) return;
    try {
      setLoading(true);
      const data = await transactionService.getTransactions(activeBudget.id);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de rechargement");
    }
  };

  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh,
  };
};
