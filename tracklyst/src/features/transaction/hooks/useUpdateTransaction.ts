import { useState } from 'react';
import { transactionService } from '../services/transactionService';
import { useTransactionStore } from '../store/transactionStore';
import type { UpdateTransactionDTO } from '../types/transaction.types';

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
      return updated;
    } catch (err) {
      // Rollback
      useTransactionStore.getState().setTransactions(snapshot);
      const msg =
        err instanceof Error ? err.message : 'Erreur de mise à jour';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateTransaction, isLoading, error };
};
