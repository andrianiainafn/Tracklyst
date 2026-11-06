import { goalService } from "@/src/features/goals/services/goalService";
import { transactionService } from "@/src/features/transaction/services/transactionService";
import { useCallback, useEffect, useState } from "react";
import { categoryService } from "../services/categoryService";
import type { Category } from "../types/category.types";
import { getErrorMessage } from "@/src/utils/errors";

export type LimitStatus = "ok" | "warning" | "over";

export interface CategorySpending {
  category: Category;
  spent: number;
  limit: number;
  remaining: number;
  /** Ratio dépensé / plafond (peut dépasser 1). */
  ratio: number;
  status: LimitStatus;
  /** Plafond du mois ou de la semaine en cours. */
  period: "month" | "week";
}

export interface MonthlySpending {
  /** Catégories avec plafond, les plus proches du dépassement en premier. */
  limited: CategorySpending[];
  /** Dépenses du mois dans des catégories sans plafond. */
  unlimitedSpent: number;
  /** Totaux des plafonds mensuels uniquement. */
  totalLimit: number;
  totalLimitedSpent: number;
  /** Épargne nette du mois : dépôts − retraits sur les objectifs. */
  saved: number;
}

// Seuil à partir duquel la barre passe à l'orange.
const WARNING_RATIO = 0.8;

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function currentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

/** Semaine en cours, du lundi au dimanche. */
export function currentWeekRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
}

export function computeMonthlySpending(
  categories: Category[],
  expenses: { category_id: string; amount: number; date?: string }[],
  savings: { type: "deposit" | "withdrawal"; amount: number }[] = [],
  now = new Date(),
): MonthlySpending {
  const month = currentMonthRange(now);
  const week = currentWeekRange(now);
  const inRange = (d: string | undefined, r: { start: string; end: string }) => !d || (d >= r.start && d <= r.end);
  const sumBy = (r: { start: string; end: string }) => {
    const map = new Map<string, number>();
    for (const tx of expenses) {
      if (!inRange(tx.date, r)) continue;
      map.set(tx.category_id, (map.get(tx.category_id) ?? 0) + Number(tx.amount));
    }
    return map;
  };
  const spentByCategory = sumBy(month);
  const spentThisWeek = sumBy(week);

  const limited: CategorySpending[] = [];
  let unlimitedSpent = 0;

  for (const category of categories) {
    if (category.type !== "expense") continue;
    const monthSpent = spentByCategory.get(category.id) ?? 0;
    const limit = Number(category.monthly_limit ?? 0);

    if (limit <= 0) {
      unlimitedSpent += monthSpent;
      continue;
    }
    const period = category.limit_period === "week" ? "week" : "month";
    const spent = period === "week" ? (spentThisWeek.get(category.id) ?? 0) : monthSpent;

    const ratio = spent / limit;
    limited.push({
      category,
      spent,
      limit,
      remaining: limit - spent,
      ratio,
      status: ratio > 1 ? "over" : ratio >= WARNING_RATIO ? "warning" : "ok",
      period,
    });
  }

  limited.sort((a, b) => b.ratio - a.ratio);
  const monthly = limited.filter((l) => l.period === "month");

  return {
    limited,
    unlimitedSpent,
    totalLimit: monthly.reduce((acc, l) => acc + l.limit, 0),
    totalLimitedSpent: monthly.reduce((acc, l) => acc + l.spent, 0),
    saved: savings.reduce(
      (acc, s) => acc + (s.type === "deposit" ? 1 : -1) * Number(s.amount),
      0,
    ),
  };
}

/**
 * Dépenses du mois en cours par catégorie, comparées aux plafonds mensuels.
 */
export const useMonthlySpending = (budgetId?: string) => {
  const [data, setData] = useState<MonthlySpending | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!budgetId) {
      setData(null);
      return;
    }
    try {
      setIsLoading(true);
      const { start, end } = currentMonthRange();
      // La semaine en cours peut commencer le mois précédent ou finir le suivant.
      const week = currentWeekRange();
      const [categories, transactions, savings] = await Promise.all([
        categoryService.getCategories(budgetId),
        transactionService.getTransactionsByDateRange(
          budgetId,
          week.start < start ? week.start : start,
          week.end > end ? week.end : end,
        ),
        goalService.getGoalTransactionsByDateRange(budgetId, start, end),
      ]);
      setData(
        computeMonthlySpending(
          categories,
          transactions.filter((t) => t.type === "expense"),
          savings,
        ),
      );
      setError(null);
    } catch (err) {
      setError(
        getErrorMessage(err, "Erreur de chargement du mois"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
};
