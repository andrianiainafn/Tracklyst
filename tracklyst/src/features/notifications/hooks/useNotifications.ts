import { useMemo } from "react";
import { useActiveBudget } from "../../budgets/hooks/useActiveBudget";
import { useGoals } from "../../goals/hooks/useGoals";
import { useSubscriptions } from "../../subscriptions/hooks/useSubscriptions";
import { formatCurrency } from "../../../utils/currency";

export type NotificationSeverity = "danger" | "warning" | "info" | "success";

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  icon: string;
  title: string;
  message: string;
}

const LOW_BALANCE_RATIO = 0.1;
const DEADLINE_SOON_DAYS = 7;

/**
 * Notifications calculées en direct à partir des vraies données du budget
 * actif (solde, objectifs) — pas de table dédiée, pas de données figées.
 */
export const useNotifications = () => {
  const { activeBudget, balance } = useActiveBudget();
  const { goals, isLoading } = useGoals();
  const { due } = useSubscriptions();

  const notifications = useMemo<AppNotification[]>(() => {
    if (!activeBudget) return [];
    const currency = activeBudget.currency;
    const items: AppNotification[] = [];

    if (balance) {
      if (balance.available_balance < 0) {
        items.push({
          id: "balance-negative",
          severity: "danger",
          icon: "exclamationmark.triangle.fill",
          title: "Solde négatif",
          message: `Le solde disponible de "${activeBudget.name}" est négatif (${formatCurrency(balance.available_balance, currency)}).`,
        });
      } else if (
        balance.total_balance > 0 &&
        balance.available_balance / balance.total_balance < LOW_BALANCE_RATIO
      ) {
        items.push({
          id: "balance-low",
          severity: "warning",
          icon: "exclamationmark.circle.fill",
          title: "Solde bas",
          message: `Il ne reste que ${formatCurrency(balance.available_balance, currency)} disponible sur "${activeBudget.name}".`,
        });
      }
    }

    for (const sub of due) {
      items.push({
        id: `subscription-due-${sub.id}-${sub.next_occurrence}`,
        severity: "warning",
        icon: "creditcard.fill",
        title: "Prélèvement à valider",
        message: `« ${sub.description ?? "Abonnement"} » (${formatCurrency(Number(sub.amount), currency)}) est dû. Validez-le ou ignorez-le depuis l'accueil.`,
      });
    }

    const now = Date.now();
    const soonThreshold = now + DEADLINE_SOON_DAYS * 24 * 60 * 60 * 1000;

    for (const goal of goals) {
      if (goal.status === "completed") {
        items.push({
          id: `goal-completed-${goal.id}`,
          severity: "success",
          icon: "checkmark.seal.fill",
          title: "Objectif atteint",
          message: `Vous avez atteint votre objectif « ${goal.name} ». Bravo !`,
        });
        continue;
      }

      if (goal.status === "in_progress" && goal.deadline) {
        const deadlineTime = new Date(`${goal.deadline}T00:00:00`).getTime();
        if (deadlineTime < now) {
          items.push({
            id: `goal-overdue-${goal.id}`,
            severity: "warning",
            icon: "clock.badge.exclamationmark.fill",
            title: "Échéance dépassée",
            message: `L'objectif « ${goal.name} » a dépassé son échéance et n'est pas encore atteint.`,
          });
        } else if (deadlineTime <= soonThreshold) {
          const daysLeft = Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24));
          items.push({
            id: `goal-deadline-${goal.id}`,
            severity: "info",
            icon: "calendar.badge.clock",
            title: "Échéance proche",
            message: `L'objectif « ${goal.name} » arrive à échéance dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`,
          });
        }
      }
    }

    const order: Record<NotificationSeverity, number> = {
      danger: 0,
      warning: 1,
      info: 2,
      success: 3,
    };
    return items.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [activeBudget, balance, goals, due]);

  return { notifications, isLoading };
};
