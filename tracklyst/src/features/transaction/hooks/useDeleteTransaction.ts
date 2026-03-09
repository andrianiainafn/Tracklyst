import { useState } from 'react';
import { transactionService } from '../services/transactionService';
import { useTransactionStore } from '../store/transactionStore';

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

    // Optimistic remove
    useTransactionStore.getState().deleteTransaction(id);

    try {
      setIsLoading(true);
      setError(null);
      await transactionService.deleteTransaction(id);
    } catch (err) {
      // Rollback
      useTransactionStore.getState().setTransactions(snapshot);
      const msg = err instanceof Error ? err.message : 'Erreur de suppression';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteTransaction, isLoading, error };
};
