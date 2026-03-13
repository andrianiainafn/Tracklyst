import { supabase } from "@/src/lib/supabase";
import type {
  Budget,
  BudgetBalance,
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from "../types/budget.types";

export const budgetService = {
  /**
   * Fetch all budgets accessible by the current user
   * (personal + group budgets via RLS).
   */
  async getBudgets(): Promise<Budget[]> {
    const { data, error } = await supabase
      .from("budgets")
      .select("id, name, owner_type, owner_id, currency, initial_amount, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...row,
      initial_amount: Number(row.initial_amount ?? 0),
    })) as Budget[];
  },

  /**
   * Fetch a single budget by id.
   */
  async getBudgetById(id: string): Promise<Budget> {
    const { data, error } = await supabase
      .from("budgets")
      .select("id, name, owner_type, owner_id, currency, initial_amount, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error) throw error;
    return {
      ...data,
      initial_amount: Number(data?.initial_amount ?? 0),
    } as Budget;
  },

  /**
   * Create a new budget.
   */
  async createBudget(dto: CreateBudgetDTO): Promise<Budget> {
    const { data, error } = await supabase
      .from("budgets")
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data as Budget;
  },

  /**
   * Update an existing budget.
   */
  async updateBudget(id: string, dto: UpdateBudgetDTO): Promise<Budget> {
    const { data, error } = await supabase
      .from("budgets")
      .update(dto)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Budget;
  },

  /**
   * Delete a budget by id.
   */
  async deleteBudget(id: string): Promise<void> {
    const { error } = await supabase.from("budgets").delete().eq("id", id);

    if (error) throw error;
  },

  /**
   * Fetch stats for a budget (income, expense, balance) - pour cartes et barre de progression.
   * Nécessite la migration 00002_get_budget_stats.sql.
   */
  async getBudgetStats(
    budgetId: string,
    date?: string
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    available_balance: number;
    locked_in_goals: number;
  }> {
    const { data, error } = await supabase.rpc("get_budget_stats", {
      p_budget_id: budgetId,
      p_date: date ?? new Date().toISOString().split("T")[0],
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      totalIncome: Number(row?.total_income ?? 0),
      totalExpense: Number(row?.total_expense ?? 0),
      available_balance: Number(row?.available_balance ?? 0),
      locked_in_goals: Number(row?.locked_in_goals ?? 0),
    };
  },

  /**
   * Call the Supabase SQL function to calculate balance for a budget.
   * Uses the `calculate_balance` function defined in the DB schema.
   */
  async getBalance(budgetId: string, date?: string): Promise<BudgetBalance> {
    const { data, error } = await supabase.rpc("calculate_balance", {
      p_budget_id: budgetId,
      p_date: date ?? new Date().toISOString().split("T")[0],
    });

    if (error) throw error;

    // rpc returns an array of rows; we want the first
    const row = Array.isArray(data) ? data[0] : data;
    return {
      total_balance: Number(row.total_balance ?? 0),
      available_balance: Number(row.available_balance ?? 0),
      locked_in_goals: Number(row.locked_in_goals ?? 0),
    };
  },
};
