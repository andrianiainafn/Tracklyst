import { useEffect } from 'react';
import { budgetService } from '../services/budgetService';
import { useBudgetStore } from '../store/budgetStore';
import type { CreateBudgetDTO, UpdateBudgetDTO } from '../types/budget.types';

/**
 * Primary hook for budgets.
 * Loads all accessible budgets on mount and exposes CRUD actions.
 */
export const useBudgets = () => {
  const {
    budgets,
    activeBudget,
    isLoading,
    error,
    setBudgets,
    setActiveBudget,
    setLoading,
    setError,
  } = useBudgetStore();

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await budgetService.getBudgets();
        setBudgets(data);

        // Auto-select the first budget if none is active yet
        if (!activeBudget && data.length > 0) {
          setActiveBudget(data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      }
    };

    load();
  }, []);

  // ── Add ──────────────────────────────────────────────────────────────────
  const addBudget = async (dto: CreateBudgetDTO) => {
    try {
      setLoading(true);
      const created = await budgetService.createBudget(dto);
      useBudgetStore.getState().addBudget(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const updateBudget = async (id: string, dto: UpdateBudgetDTO) => {
    try {
      setLoading(true);
      const updated = await budgetService.updateBudget(id, dto);
      useBudgetStore.getState().updateBudget(id, updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteBudget = async (id: string) => {
    try {
      setLoading(true);
      await budgetService.deleteBudget(id);
      useBudgetStore.getState().deleteBudget(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Refresh ───────────────────────────────────────────────────────────────
  const refresh = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getBudgets();
      setBudgets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de rechargement');
    }
  };

  return {
    budgets,
    activeBudget,
    isLoading,
    error,
    setActiveBudget,
    addBudget,
    updateBudget,
    deleteBudget,
    refresh,
  };
};
