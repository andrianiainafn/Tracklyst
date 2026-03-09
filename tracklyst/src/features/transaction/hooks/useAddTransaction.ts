import { useState } from 'react';
import { budgetService } from '../../budgets/services/budgetService';
import { useBudgetStore } from '../../budgets/store/budgetStore';
import { transactionService } from '../services/transactionService';
import { useTransactionStore } from '../store/transactionStore';
import type { CreateTransactionDTO } from '../types/transaction.types';

/**
 * Lightweight hook used by the add-transaction modal.
 * Keeps its own loading/error state so it doesn't pollute the list state.
 */
export const useAddTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTransaction = async (dto: CreateTransactionDTO) => {
    try {
      setIsLoading(true);
      setError(null);
      const created = await transactionService.createTransaction(dto);
      // Push dans le store des transactions pour MAJ immédiate de la liste
      useTransactionStore.getState().addTransaction(created);

      // Recalculer le solde du budget concerné par la transaction
      const { activeBudget, setBalance } = useBudgetStore.getState();
      const budgetId = created.budget_id;
      const balance = await budgetService.getBalance(budgetId);

      // On ne met à jour le solde affiché que si ce budget est l'actif
      if (activeBudget?.id === budgetId) {
        setBalance(balance);
      }

      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { addTransaction, isLoading, error };
};
