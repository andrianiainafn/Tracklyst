import { fieldCrypto } from "@/src/features/e2ee";
import { supabase } from "@/src/lib/supabase";
import type {
  CreateTransactionDTO,
  Transaction,
  UpdateTransactionDTO,
} from "../types/transaction.types";

/** Budget d'une transaction (pour chiffrer une modification partielle). */
async function budgetOf(id: string, dto: { budget_id?: string }) {
  if (dto.budget_id) return dto.budget_id;
  const { data, error } = await supabase.from("transactions").select("budget_id").eq("id", id).single();
  if (error) throw error;
  return data.budget_id as string;
}

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
    return fieldCrypto.decrypt("transactions", budgetId, data as Transaction[]);
  },

  /**
   * Count transactions for a budget (no rows transferred).
   */
  async countTransactions(budgetId: string): Promise<number> {
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("budget_id", budgetId);

    if (error) throw error;
    return count ?? 0;
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
    return fieldCrypto.decrypt("transactions", budgetId, data as Transaction[]);
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
    return fieldCrypto.decrypt("transactions", budgetId, data as Transaction[]);
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
    return fieldCrypto.decrypt("transactions", budgetId, data as Transaction[]);
  },

  /**
   * Create a new transaction and return the full row with category.
   */
  async createTransaction(dto: CreateTransactionDTO): Promise<Transaction> {
    const { data, error } = await supabase
      .from("transactions")
      .insert(await fieldCrypto.encrypt("transactions", dto.budget_id, dto))
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) throw error;
    return fieldCrypto.decryptOne("transactions", dto.budget_id, data as Transaction);
  },

  /**
   * Update an existing transaction.
   */
  async updateTransaction(
    id: string,
    dto: UpdateTransactionDTO,
  ): Promise<Transaction> {
    const budgetId = await budgetOf(id, dto);
    const { data, error } = await supabase
      .from("transactions")
      .update(await fieldCrypto.encrypt("transactions", budgetId, dto))
      .eq("id", id)
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) throw error;
    return fieldCrypto.decryptOne("transactions", budgetId, data as Transaction);
  },

  /**
   * Delete a transaction by id.
   */
  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) throw error;
  },
};
