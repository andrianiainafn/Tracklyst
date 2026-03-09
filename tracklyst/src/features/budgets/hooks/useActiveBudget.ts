import { useEffect } from 'react';
import { budgetService } from '../services/budgetService';
import { useBudgetStore } from '../store/budgetStore';
import type { Budget } from '../types/budget.types';

/**
 * Hook focused on the currently active budget.
 * Loads the balance whenever the activeBudget changes.
 */
export const useActiveBudget = () => {
  const { activeBudget, balance, setActiveBudget, setBalance, setError } =
    useBudgetStore();

  // ── Load balance whenever activeBudget changes ───────────────────────────
  useEffect(() => {
    if (!activeBudget?.id) {
      setBalance(null);
      return;
    }

    const loadBalance = async () => {
      try {
        const data = await budgetService.getBalance(activeBudget.id);
        setBalance(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur de calcul du solde'
        );
      }
    };

    loadBalance();
  }, [activeBudget?.id]);

  const switchBudget = (budget: Budget) => {
    setActiveBudget(budget);
  };

  return {
    activeBudget,
    balance,
    switchBudget,
  };
};
