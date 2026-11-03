import { supabase } from "./supabase";
import { nextOccurrenceAfter } from "./schedule";
import { todayISO } from "./format";
import type { Budget, Category, Goal, Subscription, Transaction, TxType } from "./types";

// Accès aux données : mêmes tables, mêmes règles que l'app mobile.

const CATEGORY_JOIN = "*, category:categories(id, name, icon, color)";

/** Message lisible pour une erreur Supabase (PostgrestError n'est pas une Error). */
export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

function check<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

export async function getBudgets(): Promise<Budget[]> {
  return check(
    await supabase
      .from("budgets")
      .select("id, name, owner_type, owner_id, currency, initial_amount, theme")
      .order("created_at", { ascending: true }),
  );
}

export async function getAvailableBalance(budgetId: string): Promise<number> {
  const rows = check(
    await supabase.rpc("get_budget_stats", { p_budget_id: budgetId, p_date: todayISO() }),
  ) as { available_balance: number | null }[];
  return Number(rows?.[0]?.available_balance ?? 0);
}

export async function getCategories(budgetId: string): Promise<Category[]> {
  return check(
    await supabase.from("categories").select("*").eq("budget_id", budgetId).order("name"),
  );
}

export async function getTransactions(budgetId: string): Promise<Transaction[]> {
  return check(
    await supabase
      .from("transactions")
      .select(CATEGORY_JOIN)
      .eq("budget_id", budgetId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}

export type TransactionInput = {
  budget_id: string;
  category_id: string;
  amount: number;
  type: TxType;
  description: string | null;
  date: string;
};

export async function saveTransaction(input: TransactionInput, id?: string) {
  const query = id
    ? supabase.from("transactions").update(input).eq("id", id)
    : supabase.from("transactions").insert(input);
  return check(await query.select(CATEGORY_JOIN).single()) as Transaction;
}

export async function deleteTransaction(id: string) {
  check(await supabase.from("transactions").delete().eq("id", id));
}

export async function getGoals(budgetId: string): Promise<Goal[]> {
  return check(
    await supabase
      .from("goals")
      .select("*")
      .eq("budget_id", budgetId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}

/** Épargne nette du mois : dépôts − retraits sur les objectifs. */
export async function getMonthSaved(budgetId: string, start: string, end: string) {
  const rows = check(
    await supabase
      .from("goal_transactions")
      .select("amount, type")
      .eq("budget_id", budgetId)
      .gte("date", start)
      .lte("date", end),
  ) as { amount: number; type: "deposit" | "withdrawal" }[];
  return rows.reduce((acc, r) => acc + (r.type === "deposit" ? 1 : -1) * Number(r.amount), 0);
}

/** Versement ou retrait sur un objectif (même enchaînement que l'app mobile). */
export async function moveGoal(
  goal: Goal,
  amount: number,
  type: "deposit" | "withdrawal",
  description: string | null,
) {
  check(
    await supabase.from("goal_transactions").insert({
      goal_id: goal.id,
      budget_id: goal.budget_id,
      amount,
      type,
      description,
      date: todayISO(),
    }),
  );
  const current = Number(goal.current_amount) + (type === "deposit" ? amount : -amount);
  const status =
    goal.status === "in_progress" || goal.status === "completed"
      ? current >= Number(goal.target_amount)
        ? "completed"
        : "in_progress"
      : goal.status;
  return check(
    await supabase
      .from("goals")
      .update({ current_amount: current, status })
      .eq("id", goal.id)
      .select("*")
      .single(),
  ) as Goal;
}

export async function getSubscriptions(budgetId: string): Promise<Subscription[]> {
  return check(
    await supabase
      .from("recurring_rules")
      .select(CATEGORY_JOIN)
      .eq("budget_id", budgetId)
      .eq("type", "expense")
      .order("next_occurrence"),
  );
}

/** Passe à l'échéance suivante ; conditionné sur l'échéance actuelle (pas de double avance). */
async function advance(sub: Subscription): Promise<boolean> {
  const next = nextOccurrenceAfter(sub);
  const ended = !!sub.end_date && next > sub.end_date;
  const rows = check(
    await supabase
      .from("recurring_rules")
      .update({ next_occurrence: next, ...(ended && { is_active: false }) })
      .eq("id", sub.id)
      .eq("next_occurrence", sub.next_occurrence)
      .select("id"),
  ) as { id: string }[];
  return rows.length > 0;
}

export async function skipSubscription(sub: Subscription) {
  await advance(sub);
}

/** Valide l'échéance : crée la dépense datée du jour d'échéance puis avance la règle. */
export async function confirmSubscription(sub: Subscription) {
  if (!(await advance(sub))) return;
  const { error } = await supabase.from("transactions").insert({
    budget_id: sub.budget_id,
    category_id: sub.category_id,
    amount: sub.amount,
    type: "expense",
    description: sub.description,
    date: sub.next_occurrence,
    is_recurring: true,
    recurring_rule_id: sub.id,
  });
  if (error) {
    await supabase
      .from("recurring_rules")
      .update({ next_occurrence: sub.next_occurrence, is_active: sub.is_active })
      .eq("id", sub.id);
    throw error;
  }
}
