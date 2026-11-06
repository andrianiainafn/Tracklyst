import { fieldCrypto } from "@/src/features/e2ee";
import { transactionService } from "@/src/features/transaction/services/transactionService";
import { supabase } from "@/src/lib/supabase";
import { todayISO } from "@/src/utils/date";
import type { Account, Transfer } from "../types";

const COLUMNS = "id, budget_id, kind, name, initial_amount, position, is_archived";

/** Comptes d'un budget et transferts entre eux (migration 00011). */
export const accountService = {
  async getAccounts(budgetId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from("budget_accounts")
      .select(COLUMNS)
      .eq("budget_id", budgetId)
      .order("position")
      .order("created_at");
    if (error) throw error;
    return fieldCrypto.decrypt(
      "budget_accounts",
      budgetId,
      (data as Account[]).map((a) => ({ ...a, initial_amount: Number(a.initial_amount) })),
    );
  },

  /** Solde de chaque compte ; la clé « none » regroupe les mouvements sans compte. */
  async getBalances(budgetId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase.rpc("get_account_balances", { p_budget_id: budgetId, p_date: todayISO() });
    if (error) throw error;
    return Object.fromEntries(
      ((data ?? []) as { account_id: string | null; balance: number }[]).map((r) => [r.account_id ?? "none", Number(r.balance)]),
    );
  },

  /** Argent des objectifs rangé sur chaque compte (versements − retraits). */
  async getSavings(budgetId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from("goal_transactions")
      .select("account_id, type, amount")
      .eq("budget_id", budgetId)
      .not("account_id", "is", null);
    if (error) throw error;
    const out: Record<string, number> = {};
    for (const g of (data ?? []) as { account_id: string; type: string; amount: number }[]) {
      out[g.account_id] = (out[g.account_id] ?? 0) + (g.type === "deposit" ? 1 : -1) * Number(g.amount);
    }
    return out;
  },

  async createAccount(input: { budget_id: string; kind: string; name: string | null; initial_amount: number }) {
    const { error } = await supabase
      .from("budget_accounts")
      .insert(await fieldCrypto.encrypt("budget_accounts", input.budget_id, input));
    if (error) throw error;
  },

  async updateAccount(
    account: Pick<Account, "id" | "budget_id">,
    input: Partial<{ kind: string; name: string | null; initial_amount: number; is_archived: boolean }>,
  ) {
    const { error } = await supabase
      .from("budget_accounts")
      .update(await fieldCrypto.encrypt("budget_accounts", account.budget_id, input))
      .eq("id", account.id);
    if (error) throw error;
  },

  /** Ses transactions restent dans le budget, sans compte. */
  async deleteAccount(id: string) {
    const { error } = await supabase.from("budget_accounts").delete().eq("id", id);
    if (error) throw error;
  },

  async getTransfers(budgetId: string): Promise<Transfer[]> {
    const { data, error } = await supabase
      .from("account_transfers")
      .select("*")
      .eq("budget_id", budgetId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return fieldCrypto.decrypt("account_transfers", budgetId, data as Transfer[]);
  },

  /** Les frais éventuels sont une dépense sur le compte de départ. */
  async createTransfer(input: {
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
    const { error } = await supabase
      .from("account_transfers")
      .insert(await fieldCrypto.encrypt("account_transfers", input.budget_id, transfer));
    if (error) throw error;
    if (fee > 0 && fee_category_id) {
      await transactionService.createTransaction({
        budget_id: input.budget_id,
        account_id: input.from_account_id,
        category_id: fee_category_id,
        amount: fee,
        type: "expense",
        description: "Frais de transfert",
        date: input.date,
      });
    }
  },
};
