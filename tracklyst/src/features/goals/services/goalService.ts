import { fieldCrypto } from "@/src/features/e2ee";
import { supabase } from "@/src/lib/supabase";
import type {
  CreateGoalDTO,
  CreateGoalTransactionDTO,
  Goal,
  GoalTransaction,
  UpdateGoalDTO,
} from "../types/goal.types";

async function goalBudget(id: string) {
  const { data, error } = await supabase.from("goals").select("budget_id").eq("id", id).single();
  if (error) throw error;
  return data.budget_id as string;
}

/** Plus retiré que versé : refusé par la base (« goal_negative »). */
function goalMovementError(error: { message?: string }) {
  return new Error(
    error.message?.includes("goal_negative")
      ? "Impossible : il y aurait plus d'argent retiré de cet objectif que versé."
      : error.message || "Une erreur est survenue.",
  );
}

export const goalService = {
  async getGoals(budgetId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from("goals")
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .eq("budget_id", budgetId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return fieldCrypto.decrypt("goals", budgetId, data as Goal[]);
  },

  async countGoals(budgetId: string): Promise<number> {
    const { count, error } = await supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("budget_id", budgetId);

    if (error) throw error;
    return count ?? 0;
  },

  async createGoal(dto: CreateGoalDTO): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .insert(await fieldCrypto.encrypt("goals", dto.budget_id, dto))
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) throw error;
    return fieldCrypto.decryptOne("goals", dto.budget_id, data as Goal);
  },

  async updateGoal(id: string, dto: UpdateGoalDTO): Promise<Goal> {
    const budgetId = await goalBudget(id);
    const { data, error } = await supabase
      .from("goals")
      .update(await fieldCrypto.encrypt("goals", budgetId, dto))
      .eq("id", id)
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) throw error;
    return fieldCrypto.decryptOne("goals", budgetId, data as Goal);
  },

  /** Objectif à jour (montant épargné recalculé par la base, migration 00012). */
  async getGoal(id: string): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    return fieldCrypto.decryptOne("goals", (data as Goal).budget_id, data as Goal);
  },

  /** Modifie un versement / retrait ; le montant épargné est recalculé par la base. */
  async updateGoalTransaction(
    tx: Pick<GoalTransaction, "id" | "budget_id">,
    dto: { amount: number; description: string | null },
  ): Promise<void> {
    const { error } = await supabase
      .from("goal_transactions")
      .update(await fieldCrypto.encrypt("goal_transactions", tx.budget_id, dto))
      .eq("id", tx.id);
    if (error) throw goalMovementError(error);
  },

  async deleteGoalTransaction(id: string): Promise<void> {
    const { error } = await supabase.from("goal_transactions").delete().eq("id", id);
    if (error) throw goalMovementError(error);
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;
  },

  async getGoalTransactions(goalId: string): Promise<GoalTransaction[]> {
    const { data, error } = await supabase
      .from("goal_transactions")
      .select("*")
      .eq("goal_id", goalId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    const rows = data as GoalTransaction[];
    return rows.length ? fieldCrypto.decrypt("goal_transactions", rows[0].budget_id, rows) : rows;
  },

  /** Mouvements d'épargne de tous les objectifs d'un budget sur une période. */
  async getGoalTransactionsByDateRange(
    budgetId: string,
    startDate: string,
    endDate: string,
  ): Promise<GoalTransaction[]> {
    const { data, error } = await supabase
      .from("goal_transactions")
      .select("*")
      .eq("budget_id", budgetId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) throw error;
    return fieldCrypto.decrypt("goal_transactions", budgetId, data as GoalTransaction[]);
  },

  async createGoalTransaction(
    dto: CreateGoalTransactionDTO,
  ): Promise<GoalTransaction> {
    const { data, error } = await supabase
      .from("goal_transactions")
      .insert(await fieldCrypto.encrypt("goal_transactions", dto.budget_id, dto))
      .select("*")
      .single();

    if (error) throw error;
    return fieldCrypto.decryptOne("goal_transactions", dto.budget_id, data as GoalTransaction);
  },
};

