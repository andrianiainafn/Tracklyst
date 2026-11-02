import { supabase } from "@/src/lib/supabase";
import type {
  CreateGoalDTO,
  CreateGoalTransactionDTO,
  Goal,
  GoalTransaction,
  UpdateGoalDTO,
} from "../types/goal.types";

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
    return data as Goal[];
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
      .insert(dto)
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) throw error;
    return data as Goal;
  },

  async updateGoal(id: string, dto: UpdateGoalDTO): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .update(dto)
      .eq("id", id)
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) throw error;
    return data as Goal;
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
    return data as GoalTransaction[];
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
    return data as GoalTransaction[];
  },

  async createGoalTransaction(
    dto: CreateGoalTransactionDTO,
  ): Promise<GoalTransaction> {
    const { data, error } = await supabase
      .from("goal_transactions")
      .insert(dto)
      .select("*")
      .single();

    if (error) throw error;
    return data as GoalTransaction;
  },
};

