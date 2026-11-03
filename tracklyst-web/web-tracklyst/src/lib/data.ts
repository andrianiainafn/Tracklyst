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

// ─── Création (mêmes règles que l'app mobile) ────────────────────────────────

/** Catégories proposées à la création d'un budget (identiques au mobile). */
export const DEFAULT_CATEGORIES: { name: string; type: TxType; icon: string; color: string }[] = [
  { name: "Salaire", type: "income", icon: "cash-multiple", color: "#10B981" },
  { name: "Autre revenu", type: "income", icon: "wallet-outline", color: "#34D399" },
  { name: "Loyer", type: "expense", icon: "home-outline", color: "#EF4444" },
  { name: "Courses", type: "expense", icon: "cart-outline", color: "#F59E0B" },
  { name: "Transport", type: "expense", icon: "car-outline", color: "#3B82F6" },
  { name: "Essence", type: "expense", icon: "gas-station-outline", color: "#0EA5E9" },
  { name: "Abonnements", type: "expense", icon: "autorenew", color: "#8B5CF6" },
  { name: "Loisirs", type: "expense", icon: "gamepad-variant-outline", color: "#EC4899" },
  { name: "Restaurant", type: "expense", icon: "silverware-fork-knife", color: "#F97316" },
  { name: "Santé", type: "expense", icon: "medical-bag", color: "#06B6D4" },
  { name: "Petites dépenses", type: "expense", icon: "receipt-text-outline", color: "#A855F7" },
  { name: "Autre dépense", type: "expense", icon: "dots-horizontal-circle-outline", color: "#64748B" },
];

/** Ajoute les catégories par défaut absentes du budget (comparaison nom + type). */
export async function addDefaultCategories(budgetId: string, existing: Pick<Category, "name" | "type">[]) {
  const taken = new Set(existing.map((c) => `${c.type}:${c.name.toLowerCase()}`));
  const missing = DEFAULT_CATEGORIES.filter((c) => !taken.has(`${c.type}:${c.name.toLowerCase()}`)).map((c) => ({
    ...c,
    budget_id: budgetId,
  }));
  if (missing.length === 0) return;
  check(await supabase.from("categories").insert(missing));
}

export async function createBudget(input: {
  name: string;
  currency: string;
  initial_amount: number;
  theme: string;
  withDefaultCategories: boolean;
}): Promise<Budget> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Session expirée : reconnectez-vous.");
  const budget = check(
    await supabase
      .from("budgets")
      .insert({
        name: input.name,
        owner_type: "user",
        owner_id: auth.user.id,
        currency: input.currency,
        initial_amount: input.initial_amount,
        theme: input.theme,
      })
      .select("id, name, owner_type, owner_id, currency, initial_amount, theme")
      .single(),
  ) as Budget;
  if (input.withDefaultCategories) await addDefaultCategories(budget.id, []);
  return budget;
}

export async function createGoal(input: {
  budget_id: string;
  name: string;
  target_amount: number;
  deadline: string | null;
  description: string | null;
}) {
  check(await supabase.from("goals").insert({ ...input, deadline: input.deadline ?? undefined }));
}

export async function createSubscription(input: {
  budget_id: string;
  category_id: string;
  amount: number;
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  start_date: string;
}) {
  check(
    await supabase.from("recurring_rules").insert({
      ...input,
      type: "expense",
      interval: 1,
      next_occurrence: input.start_date,
    }),
  );
}

// ─── Partage de budget (fonctions SQL de la migration 00008) ─────────────────

export interface BudgetMember {
  user_id: string;
  display_name: string;
  email: string | null;
  role: "owner" | "admin" | "member";
  joined_at: string;
  is_me: boolean;
}

const SHARING_ERRORS: Record<string, string> = {
  invalid_code: "Ce code ne correspond à aucun budget. Vérifiez les 6 caractères.",
  not_owner: "Seul le propriétaire du budget peut faire cela.",
  owner_cannot_leave: "Vous êtes le propriétaire : retirez d'abord les autres membres.",
  cannot_remove_self: "Vous ne pouvez pas vous retirer vous-même.",
  forbidden: "Vous n'avez pas accès à ce budget.",
  budget_not_found: "Budget introuvable.",
  not_authenticated: "Session expirée : reconnectez-vous.",
};

function sharingCheck<T>({ data, error }: { data: T | null; error: { message?: string } | null }): T {
  if (error) {
    const key = Object.keys(SHARING_ERRORS).find((k) => error.message?.includes(k));
    throw new Error(key ? SHARING_ERRORS[key] : error.message || "Une erreur est survenue.");
  }
  return data as T;
}

/** Normalise une saisie (espaces, tirets, minuscules) en code de 6 caractères. */
export const normalizeShareCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export async function getShareCode(budgetId: string, renew = false): Promise<string> {
  return sharingCheck(await supabase.rpc("share_budget", { p_budget_id: budgetId, p_renew: renew }));
}

export async function joinBudget(code: string): Promise<string> {
  return sharingCheck(await supabase.rpc("join_budget", { p_code: normalizeShareCode(code) }));
}

export async function getBudgetMembers(budgetId: string): Promise<BudgetMember[]> {
  return sharingCheck(await supabase.rpc("budget_members", { p_budget_id: budgetId })) ?? [];
}

export async function removeBudgetMember(budgetId: string, userId: string) {
  sharingCheck(await supabase.rpc("remove_budget_member", { p_budget_id: budgetId, p_user_id: userId }));
}

export async function leaveBudget(budgetId: string) {
  sharingCheck(await supabase.rpc("leave_budget", { p_budget_id: budgetId }));
}

// ─── Modification / suppression ───────────────────────────────────────────────

/** Plafond mensuel d'une catégorie ; null retire le plafond. */
export async function updateCategoryLimit(categoryId: string, limit: number | null) {
  check(await supabase.from("categories").update({ monthly_limit: limit }).eq("id", categoryId));
}

export type SubscriptionInput = {
  category_id: string;
  amount: number;
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  next_occurrence: string;
};

export async function updateSubscription(id: string, input: Partial<SubscriptionInput> & { is_active?: boolean }) {
  check(await supabase.from("recurring_rules").update(input).eq("id", id));
}

export async function deleteSubscription(id: string) {
  check(await supabase.from("recurring_rules").delete().eq("id", id));
}

export async function updateGoal(
  id: string,
  input: { name: string; target_amount: number; deadline: string | null; description: string | null },
) {
  check(await supabase.from("goals").update(input).eq("id", id));
}

/** Supprime l'objectif : l'argent épargné redevient disponible dans le budget. */
export async function deleteGoal(id: string) {
  check(await supabase.from("goals").delete().eq("id", id));
}

export async function updateBudget(id: string, input: { name: string; theme: string; initial_amount: number }) {
  check(await supabase.from("budgets").update(input).eq("id", id));
}

/**
 * Supprime le budget et tout son contenu (suppression en cascade côté base).
 * Budget partagé : le groupe associé est supprimé aussi.
 */
export async function deleteBudget(budget: Pick<Budget, "id" | "owner_type" | "owner_id">) {
  check(await supabase.from("budgets").delete().eq("id", budget.id));
  if (budget.owner_type === "group") check(await supabase.from("groups").delete().eq("id", budget.owner_id));
}
