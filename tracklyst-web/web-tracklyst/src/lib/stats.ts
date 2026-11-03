import { monthKey, todayISO } from "./format";
import type { Category, Subscription, Transaction } from "./types";

export type MonthTotals = { income: number; expense: number };

export function monthTotals(transactions: Transaction[], key: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!t.date.startsWith(key)) continue;
    if (t.type === "income") income += Number(t.amount);
    else expense += Number(t.amount);
  }
  return { income, expense };
}

export const currentAndPreviousKeys = (now = new Date()) => ({
  current: monthKey(now),
  previous: monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
  previousLabel: new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("fr-FR", { month: "short" }),
});

export type LimitStatus = "ok" | "warning" | "over";
export type LimitRow = { category: Category; spent: number; limit: number; ratio: number; status: LimitStatus };

/** Catégories plafonnées du mois, les plus proches du dépassement en premier. */
export function monthLimits(categories: Category[], transactions: Transaction[], key: string): LimitRow[] {
  const spent = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === "expense" && t.date.startsWith(key)) {
      spent.set(t.category_id, (spent.get(t.category_id) ?? 0) + Number(t.amount));
    }
  }
  return categories
    .filter((c) => c.type === "expense" && Number(c.monthly_limit ?? 0) > 0)
    .map((c) => {
      const limit = Number(c.monthly_limit);
      const s = spent.get(c.id) ?? 0;
      const ratio = s / limit;
      return { category: c, spent: s, limit, ratio, status: (ratio > 1 ? "over" : ratio >= 0.8 ? "warning" : "ok") as LimitStatus };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export type CategoryShare = { id: string; name: string; icon: string | null; color: string | null; amount: number; share: number };

/** Dépenses du mois par catégorie ; au-delà de 5, regroupées dans « Autres ». */
export function categoryBreakdown(transactions: Transaction[], key: string): { rows: CategoryShare[]; total: number } {
  const map = new Map<string, CategoryShare>();
  let total = 0;
  for (const t of transactions) {
    if (t.type !== "expense" || !t.date.startsWith(key)) continue;
    const amount = Number(t.amount);
    total += amount;
    const id = t.category?.id ?? t.category_id;
    const row = map.get(id) ?? { id, name: t.category?.name ?? "Sans catégorie", icon: t.category?.icon ?? null, color: t.category?.color ?? null, amount: 0, share: 0 };
    row.amount += amount;
    map.set(id, row);
  }
  const sorted = [...map.values()].sort((a, b) => b.amount - a.amount);
  const rows = sorted.slice(0, 5);
  const tail = sorted.slice(5);
  if (tail.length) {
    rows.push({ id: "__others__", name: `Autres (${tail.length})`, icon: "dots-horizontal-circle-outline", color: null, amount: tail.reduce((a, c) => a + c.amount, 0), share: 0 });
  }
  rows.forEach((r) => (r.share = total ? r.amount / total : 0));
  return { rows, total };
}

export const dueSubscriptions = (subs: Subscription[]) =>
  subs.filter((s) => s.is_active && s.next_occurrence <= todayISO());
