import { transactionService } from "@/src/features/transaction/services/transactionService";
import type { Transaction } from "@/src/features/transaction/types/transaction.types";
import { getErrorMessage } from "@/src/utils/errors";
import { useCallback, useEffect, useState } from "react";

export interface MonthFlow {
  key: string; // "YYYY-MM"
  label: string; // "nov."
  longLabel: string; // "novembre"
  income: number;
  expense: number;
}

export interface CategoryTotal {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  share: number; // 0..1 du total du mois
}

export interface DashboardStats {
  months: MonthFlow[]; // du plus ancien au mois en cours
  current: MonthFlow;
  previous: MonthFlow;
  byCategory: CategoryTotal[]; // dépenses du mois, plus grosses d'abord
}

const MONTHS = 6;
// Au-delà, les catégories sont regroupées dans « Autres ».
const MAX_CATEGORIES = 5;

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function buildDashboardStats(
  transactions: Pick<Transaction, "amount" | "type" | "date" | "category" | "category_id">[],
  now = new Date(),
): DashboardStats {
  const months: MonthFlow[] = [];
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKey(d),
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      longLabel: d.toLocaleDateString("fr-FR", { month: "long" }),
      income: 0,
      expense: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  const current = months[months.length - 1];

  const categories = new Map<string, CategoryTotal>();
  for (const tx of transactions) {
    const month = byKey.get(tx.date.slice(0, 7));
    if (!month) continue;
    const amount = Number(tx.amount);
    if (tx.type === "income") {
      month.income += amount;
      continue;
    }
    month.expense += amount;
    if (month !== current) continue;

    const id = tx.category?.id ?? tx.category_id;
    const entry = categories.get(id) ?? {
      id,
      name: tx.category?.name ?? "Sans catégorie",
      icon: tx.category?.icon ?? null,
      color: tx.category?.color ?? null,
      amount: 0,
      share: 0,
    };
    entry.amount += amount;
    categories.set(id, entry);
  }

  const sorted = [...categories.values()].sort((a, b) => b.amount - a.amount);
  const head = sorted.slice(0, MAX_CATEGORIES);
  const tail = sorted.slice(MAX_CATEGORIES);
  if (tail.length > 0) {
    head.push({
      id: "__others__",
      name: `Autres (${tail.length})`,
      icon: "dots-horizontal-circle-outline",
      color: null,
      amount: tail.reduce((acc, c) => acc + c.amount, 0),
      share: 0,
    });
  }
  const total = current.expense || 1;
  head.forEach((c) => (c.share = c.amount / total));

  return {
    months,
    current,
    previous: months[months.length - 2],
    byCategory: head,
  };
}

/**
 * Flux des 6 derniers mois + répartition des dépenses du mois en cours.
 */
export const useDashboardStats = (budgetId?: string) => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!budgetId) {
      setData(null);
      return;
    }
    try {
      setIsLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const transactions = await transactionService.getTransactionsByDateRange(
        budgetId,
        `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
        `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
      );
      setData(buildDashboardStats(transactions, now));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Erreur de chargement des statistiques"));
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
};
