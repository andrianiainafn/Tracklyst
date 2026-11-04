import { fieldCrypto, keyManager } from "./e2ee";
import { supabase } from "./supabase";
import { nextOccurrenceAfter } from "./schedule";
import { todayISO } from "./format";
import type { Account, Budget, Category, Goal, Subscription, Transaction, Transfer, TxType } from "./types";

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

/** Budget d'une ligne (pour chiffrer une modification partielle). */
async function budgetOf(table: "goals" | "recurring_rules", id: string) {
  const row = check(await supabase.from(table).select("budget_id").eq("id", id).single()) as { budget_id: string };
  return row.budget_id;
}

export async function getBudgets(): Promise<Budget[]> {
  const rows = check(
    await supabase
      .from("budgets")
      .select("id, name, owner_type, owner_id, currency, initial_amount, theme, account_kind, account_name")
      .order("created_at", { ascending: true }),
  ) as Budget[];
  return fieldCrypto.decryptBudgets(rows);
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
  const rows = check(
    await supabase
      .from("transactions")
      .select(CATEGORY_JOIN)
      .eq("budget_id", budgetId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ) as Transaction[];
  return fieldCrypto.decrypt("transactions", budgetId, rows);
}

export type TransactionInput = {
  budget_id: string;
  category_id: string;
  amount: number;
  type: TxType;
  description: string | null;
  date: string;
  account_id: string | null;
};

export async function saveTransaction(input: TransactionInput, id?: string) {
  const sealed = await fieldCrypto.encrypt("transactions", input.budget_id, input);
  const query = id
    ? supabase.from("transactions").update(sealed).eq("id", id)
    : supabase.from("transactions").insert(sealed);
  const row = check(await query.select(CATEGORY_JOIN).single()) as Transaction;
  return fieldCrypto.decryptOne("transactions", input.budget_id, row);
}

export async function deleteTransaction(id: string) {
  check(await supabase.from("transactions").delete().eq("id", id));
}

export async function getGoals(budgetId: string): Promise<Goal[]> {
  const rows = check(
    await supabase
      .from("goals")
      .select("*")
      .eq("budget_id", budgetId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false }),
  ) as Goal[];
  return fieldCrypto.decrypt("goals", budgetId, rows);
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
    await supabase.from("goal_transactions").insert(
      await fieldCrypto.encrypt("goal_transactions", goal.budget_id, {
        goal_id: goal.id,
        budget_id: goal.budget_id,
        amount,
        type,
        description,
        date: todayISO(),
      }),
    ),
  );
  // Montant épargné et statut recalculés par la base (migration 00012).
  const row = check(await supabase.from("goals").select("*").eq("id", goal.id).single()) as Goal;
  return fieldCrypto.decryptOne("goals", goal.budget_id, row);
}

export async function getSubscriptions(budgetId: string): Promise<Subscription[]> {
  const rows = check(
    await supabase
      .from("recurring_rules")
      .select(CATEGORY_JOIN)
      .eq("budget_id", budgetId)
      .eq("type", "expense")
      .order("next_occurrence"),
  ) as Subscription[];
  return fieldCrypto.decrypt("recurring_rules", budgetId, rows);
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
  const { error } = await supabase.from("transactions").insert(
    await fieldCrypto.encrypt("transactions", sub.budget_id, {
      budget_id: sub.budget_id,
      category_id: sub.category_id,
      amount: sub.amount,
      type: "expense",
      description: sub.description,
      date: sub.next_occurrence,
      is_recurring: true,
      recurring_rule_id: sub.id,
      account_id: sub.account_id ?? null,
    }),
  );
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
  account_kind: string | null;
  account_name: string | null;
  withDefaultCategories: boolean;
}): Promise<Budget> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Session expirée : reconnectez-vous.");
  // Chiffrement : clé et identifiant créés ici, le nom part déjà chiffré.
  const id = crypto.randomUUID();
  const key = keyManager.status === "unlocked" ? keyManager.newBudgetKey() : null;
  const seal = (text: string | null) => (key ? keyManager.e2ee.encryptText(key, text) : text);
  const budget = check(
    await supabase
      .from("budgets")
      .insert({
        id,
        name: seal(input.name),
        owner_type: "user",
        owner_id: auth.user.id,
        currency: input.currency,
        initial_amount: 0,
        theme: input.theme,
      })
      .select("id, name, owner_type, owner_id, currency, initial_amount, theme, account_kind, account_name")
      .single(),
  ) as Budget;
  if (key) await keyManager.registerBudgetKey(id, key);
  // Le solde de départ appartient au premier compte (MVola, BNI…).
  await createAccount({
    budget_id: id,
    kind: input.account_kind ?? "other",
    name: input.account_name?.trim() || "Compte principal",
    initial_amount: input.initial_amount,
  });
  if (input.withDefaultCategories) await addDefaultCategories(budget.id, []);
  return { ...budget, name: input.name };
}

export async function createGoal(input: {
  budget_id: string;
  name: string;
  target_amount: number;
  deadline: string | null;
  description: string | null;
}) {
  check(
    await supabase
      .from("goals")
      .insert(await fieldCrypto.encrypt("goals", input.budget_id, { ...input, deadline: input.deadline ?? undefined })),
  );
}

export async function createSubscription(input: {
  budget_id: string;
  account_id: string | null;
  category_id: string;
  amount: number;
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  start_date: string;
}) {
  check(
    await supabase.from("recurring_rules").insert(
      await fieldCrypto.encrypt("recurring_rules", input.budget_id, {
        ...input,
        type: "expense",
        interval: 1,
        next_occurrence: input.start_date,
      }),
    ),
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
  account_id: string | null;
  category_id: string;
  amount: number;
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  next_occurrence: string;
};

export async function updateSubscription(id: string, input: Partial<SubscriptionInput> & { is_active?: boolean }) {
  const sealed = await fieldCrypto.encrypt("recurring_rules", await budgetOf("recurring_rules", id), input);
  check(await supabase.from("recurring_rules").update(sealed).eq("id", id));
}

export async function deleteSubscription(id: string) {
  check(await supabase.from("recurring_rules").delete().eq("id", id));
}

export async function updateGoal(
  id: string,
  input: { name: string; target_amount: number; deadline: string | null; description: string | null },
) {
  const sealed = await fieldCrypto.encrypt("goals", await budgetOf("goals", id), input);
  check(await supabase.from("goals").update(sealed).eq("id", id));
}

/** Supprime l'objectif : l'argent épargné redevient disponible dans le budget. */
export async function deleteGoal(id: string) {
  check(await supabase.from("goals").delete().eq("id", id));
}

export async function updateBudget(id: string, input: { name: string; theme: string }) {
  check(await supabase.from("budgets").update(await fieldCrypto.encrypt("budgets", id, input)).eq("id", id));
}

/**
 * Supprime le budget et tout son contenu (suppression en cascade côté base).
 * Budget partagé : le groupe associé est supprimé aussi.
 */
export async function deleteBudget(budget: Pick<Budget, "id" | "owner_type" | "owner_id">) {
  check(await supabase.from("budgets").delete().eq("id", budget.id));
  if (budget.owner_type === "group") check(await supabase.from("groups").delete().eq("id", budget.owner_id));
}

// ─── Comptes d'un budget (migration 00011) ───────────────────────────────────

const ACCOUNT_COLUMNS = "id, budget_id, kind, name, initial_amount, position, is_archived";

export async function getAccounts(budgetId: string): Promise<Account[]> {
  const rows = check(
    await supabase
      .from("budget_accounts")
      .select(ACCOUNT_COLUMNS)
      .eq("budget_id", budgetId)
      .order("position")
      .order("created_at"),
  ) as Account[];
  return fieldCrypto.decrypt(
    "budget_accounts",
    budgetId,
    rows.map((a) => ({ ...a, initial_amount: Number(a.initial_amount) })),
  );
}

/** Solde de chaque compte ; la clé « none » regroupe les mouvements sans compte. */
export async function getAccountBalances(budgetId: string): Promise<Record<string, number>> {
  const rows = check(
    await supabase.rpc("get_account_balances", { p_budget_id: budgetId, p_date: todayISO() }),
  ) as { account_id: string | null; balance: number }[];
  return Object.fromEntries((rows ?? []).map((r) => [r.account_id ?? "none", Number(r.balance)]));
}

export async function createAccount(input: { budget_id: string; kind: string; name: string | null; initial_amount: number }) {
  const sealed = await fieldCrypto.encrypt("budget_accounts", input.budget_id, input);
  return check(await supabase.from("budget_accounts").insert(sealed).select("id").single()) as { id: string };
}

export async function updateAccount(
  account: Pick<Account, "id" | "budget_id">,
  input: Partial<{ kind: string; name: string | null; initial_amount: number; is_archived: boolean }>,
) {
  const sealed = await fieldCrypto.encrypt("budget_accounts", account.budget_id, input);
  check(await supabase.from("budget_accounts").update(sealed).eq("id", account.id));
}

/** Supprime un compte : ses transactions restent, sans compte (« Non attribué »). */
export async function deleteAccount(id: string) {
  check(await supabase.from("budget_accounts").delete().eq("id", id));
}

export async function getTransfers(budgetId: string): Promise<Transfer[]> {
  const rows = check(
    await supabase
      .from("account_transfers")
      .select("*")
      .eq("budget_id", budgetId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ) as Transfer[];
  return fieldCrypto.decrypt("account_transfers", budgetId, rows);
}

/**
 * Transfert entre deux comptes. Les frais éventuels (retrait MVola…) sont
 * une dépense sur le compte de départ.
 */
export async function createTransfer(input: {
  budget_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  fee: number;
  fee_category_id: string | null;
  description: string | null;
  date: string;
}) {
  const { fee, fee_category_id, ...transfer } = input;
  check(await supabase.from("account_transfers").insert(await fieldCrypto.encrypt("account_transfers", input.budget_id, transfer)));
  if (fee > 0 && fee_category_id) {
    await saveTransaction({
      budget_id: input.budget_id,
      account_id: input.from_account_id,
      category_id: fee_category_id,
      amount: fee,
      type: "expense",
      description: "Frais de transfert",
      date: input.date,
    });
  }
}

export async function deleteTransfer(id: string) {
  check(await supabase.from("account_transfers").delete().eq("id", id));
}

// ─── Mouvements d'un objectif (migration 00012 : montant recalculé par la base) ──

export interface GoalMovement {
  id: string;
  goal_id: string;
  budget_id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  description: string | null;
  date: string;
  created_at: string;
}

const goalError = (err: unknown, fallback: string) => {
  const msg = errorMessage(err, fallback);
  return new Error(msg.includes("goal_negative") ? "Impossible : il y aurait plus d'argent retiré de cet objectif que versé." : msg);
};

export async function getGoalMovements(goal: Pick<Goal, "id" | "budget_id">): Promise<GoalMovement[]> {
  const rows = check(
    await supabase
      .from("goal_transactions")
      .select("id, goal_id, budget_id, amount, type, description, date, created_at")
      .eq("goal_id", goal.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ) as GoalMovement[];
  return fieldCrypto.decrypt("goal_transactions", goal.budget_id, rows);
}

export async function updateGoalMovement(m: GoalMovement, input: { amount: number; description: string | null }) {
  try {
    check(
      await supabase
        .from("goal_transactions")
        .update(await fieldCrypto.encrypt("goal_transactions", m.budget_id, input))
        .eq("id", m.id),
    );
  } catch (err) {
    throw goalError(err, "Modification impossible.");
  }
}

export async function deleteGoalMovement(id: string) {
  try {
    check(await supabase.from("goal_transactions").delete().eq("id", id));
  } catch (err) {
    throw goalError(err, "Suppression impossible.");
  }
}
