import { supabase } from "@/src/lib/supabase";
import type {
  CreateTransactionDTO,
  Transaction,
  UpdateTransactionDTO,
} from "../types/transaction.types";

export const transactionService = {
  /**
   * Fetch all transactions for a budget, newest first.
   * Joins category name/icon/color via foreign key.
   */
  async getTransactions(budgetId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .eq("budget_id", budgetId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Fetch transactions filtered by type (income / expense).
   */
  async getTransactionsByType(
    budgetId: string,
    type: "income" | "expense",
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .eq("budget_id", budgetId)
      .eq("type", type)
      .order("date", { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Fetch transactions within a date range.
   */
  async getTransactionsByDateRange(
    budgetId: string,
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .eq("budget_id", budgetId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Fetch transactions for a specific category.
   */
  async getTransactionsByCategory(
    budgetId: string,
    categoryId: string,
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("budget_id", budgetId)
      .eq("category_id", categoryId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  },

  /**
   * Create a new transaction and return the full row with category.
   */
  async createTransaction(dto: CreateTransactionDTO): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
      .insert(dto)
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  /**
   * Update an existing transaction.
   */
  async updateTransaction(
    id: string,
    dto: UpdateTransactionDTO,
  ): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
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
    return data as Transaction;
  },

  /**
   * Delete a transaction by id.
   */
  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) throw error;
  },
};
