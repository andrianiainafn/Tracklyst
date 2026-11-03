import { useState } from 'react';
import { budgetService } from '../../budgets/services/budgetService';
import { useBudgetStore } from '../../budgets/store/budgetStore';
import { transactionService } from '../services/transactionService';
import { useTransactionStore } from '../store/transactionStore';
import type { UpdateTransactionDTO } from '../types/transaction.types';
import { getErrorMessage } from "@/src/utils/errors";

/**
 * Hook for updating a transaction with optimistic update.
 * Rolls back if the server call fails.
 */
export const useUpdateTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTransaction = async (id: string, dto: UpdateTransactionDTO) => {
    // Snapshot for rollback
    const snapshot = useTransactionStore.getState().transactions;
    const current = snapshot.find((t) => t.id === id);

    // Optimistic update
    if (current) {
      useTransactionStore.getState().updateTransaction(id, dto as any);
    }

    try {
      setIsLoading(true);
      setError(null);
      const updated = await transactionService.updateTransaction(id, dto);
      // Sync with server truth (includes joined category)
      useTransactionStore.getState().updateTransaction(id, updated);

      // Recalculer le solde du budget concerné (le montant/type a pu changer)
      const { activeBudget, setBalance } = useBudgetStore.getState();
      const balance = await budgetService.getBalance(updated.budget_id);
      if (activeBudget?.id === updated.budget_id) {
        setBalance(balance);
      }

      return updated;
    } catch (err) {
      // Rollback
      useTransactionStore.getState().setTransactions(snapshot);
      const msg =
        getErrorMessage(err, 'Erreur de mise à jour');
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateTransaction, isLoading, error };
};
