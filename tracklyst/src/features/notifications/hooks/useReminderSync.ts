import type { Budget } from "@/src/features/budgets/types/budget.types";
import type { MonthlySpending } from "@/src/features/categories/hooks/useMonthlySpending";
import type { Goal } from "@/src/features/goals/types/goal.types";
import type { Subscription } from "@/src/features/subscriptions/types/subscription.types";
import { useEffect, useState } from "react";
import {
  DeliveryMode,
  notifyLimitAlerts,
  registerPushToken,
  syncGoalReminders,
  syncSubscriptionReminders,
} from "../services/localNotifications";

const warn = (label: string) => (err: unknown) => {
  if (__DEV__) console.warn(`[notifications] ${label}`, err);
};

/**
 * Active les push serveur si possible ; sinon (Expo Go Android) garde les
 * notifications locales alignées sur les données du budget actif.
 */
export function useReminderSync({
  budget,
  subscriptions,
  goals,
  monthly,
}: {
  budget: Budget | null;
  subscriptions: Subscription[];
  goals: Goal[];
  monthly: MonthlySpending | null;
}) {
  const [mode, setMode] = useState<DeliveryMode | null>(null);

  // Demande l'autorisation puis enregistre le jeton push de l'appareil.
  useEffect(() => {
    registerPushToken().then(setMode).catch((err) => {
      warn("enregistrement")(err);
      setMode("local");
    });
  }, []);

  // En mode serveur, Supabase envoie tout : rien à programmer ici.
  const local = mode === "local";

  useEffect(() => {
    if (!local || !budget) return;
    syncSubscriptionReminders(subscriptions, budget.currency).catch(warn("abonnements"));
  }, [local, budget?.id, budget?.currency, subscriptions]);

  useEffect(() => {
    if (!local || !budget) return;
    syncGoalReminders(goals, budget.currency).catch(warn("objectifs"));
  }, [local, budget?.id, budget?.currency, goals]);

  useEffect(() => {
    if (!local || !budget || !monthly) return;
    notifyLimitAlerts(monthly.limited, budget.currency).catch(warn("plafonds"));
  }, [local, budget?.id, monthly]);
}
