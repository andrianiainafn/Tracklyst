import { useState } from 'react';
import { budgetService } from '../../budgets/services/budgetService';
import { useBudgetStore } from '../../budgets/store/budgetStore';
import { transactionService } from '../services/transactionService';
import { useTransactionStore } from '../store/transactionStore';
import { getErrorMessage } from "@/src/utils/errors";

/**
 * Hook for deleting a transaction with optimistic update.
 * Rolls back if the server call fails.
 */
export const useDeleteTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteTransaction = async (id: string) => {
    // Snapshot for rollback
    const snapshot = useTransactionStore.getState().transactions;
    const deleted = snapshot.find((t) => t.id === id);

    // Optimistic remove
    useTransactionStore.getState().deleteTransaction(id);

    try {
      setIsLoading(true);
      setError(null);
      await transactionService.deleteTransaction(id);

      // Recalculer le solde du budget concerné
      if (deleted) {
        const { activeBudget, setBalance } = useBudgetStore.getState();
        const balance = await budgetService.getBalance(deleted.budget_id);
        if (activeBudget?.id === deleted.budget_id) {
          setBalance(balance);
        }
      }
    } catch (err) {
      // Rollback
      useTransactionStore.getState().setTransactions(snapshot);
      const msg = getErrorMessage(err, 'Erreur de suppression');
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteTransaction, isLoading, error };
};
