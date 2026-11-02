import { budgetService } from "@/src/features/budgets/services/budgetService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useTransactionStore } from "@/src/features/transaction/store/transactionStore";
import { useCallback, useEffect, useMemo } from "react";
import { subscriptionService } from "../services/subscriptionService";
import { useSubscriptionStore } from "../store/subscriptionStore";
import type { Subscription } from "../types/subscription.types";
import { monthlyCost, todayISO } from "../utils/schedule";

/**
 * Abonnements du budget actif + échéances à valider (rappel, pas
 * d'automatisme : rien n'est débité sans action de l'utilisateur).
 */
export const useSubscriptions = () => {
  const { activeBudget } = useBudgetStore();
  const {
    budgetId,
    subscriptions,
    isLoading,
    error,
    setSubscriptions,
    upsertSubscription,
    setLoading,
    setError,
  } = useSubscriptionStore();

  const targetBudgetId = activeBudget?.id;

  const refresh = useCallback(async () => {
    if (!targetBudgetId) return;
    try {
      setLoading(true);
      const data = await subscriptionService.getSubscriptions(targetBudgetId);
      setSubscriptions(targetBudgetId, data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur de chargement des abonnements",
      );
    }
  }, [targetBudgetId]);

  useEffect(() => {
    if (targetBudgetId && budgetId !== targetBudgetId) refresh();
  }, [targetBudgetId, budgetId, refresh]);

  // Évite d'afficher les abonnements d'un autre budget pendant le rechargement.
  const current = budgetId === targetBudgetId ? subscriptions : [];

  const { due, active, monthlyTotal } = useMemo(() => {
    const today = todayISO();
    const active = current.filter((s) => s.is_active);
    return {
      active,
      due: active.filter((s) => s.next_occurrence <= today),
      monthlyTotal: active.reduce((acc, s) => acc + monthlyCost(s), 0),
    };
  }, [current]);

  /** Crée la dépense de l'échéance et passe à la suivante. */
  const confirm = async (sub: Subscription) => {
    const result = await subscriptionService.confirm(sub);
    if (!result) return refresh();

    upsertSubscription(result.subscription);
    useTransactionStore.getState().addTransaction(result.transaction);

    const { activeBudget, setBalance } = useBudgetStore.getState();
    if (activeBudget?.id === sub.budget_id) {
      setBalance(await budgetService.getBalance(sub.budget_id));
    }
  };

  /** Ignore cette échéance (rien n'est débité). */
  const skip = async (sub: Subscription) => {
    const advanced = await subscriptionService.advance(sub);
    if (advanced) upsertSubscription(advanced);
    else await refresh();
  };

  return {
    subscriptions: current,
    active,
    due,
    monthlyTotal,
    isLoading,
    error,
    refresh,
    confirm,
    skip,
  };
};
