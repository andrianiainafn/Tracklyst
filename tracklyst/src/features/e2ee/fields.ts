/**
 * Chiffrement des champs texte avant écriture, déchiffrement à la lecture —
 * commun mobile / web (copie identique : tracklyst-web/web-tracklyst/src/lib/e2ee/fields.ts).
 *
 * Les anciens textes encore en clair (créés avant l'activation, ou par une
 * ancienne version de l'app) sont chiffrés en base au passage.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isEncrypted } from "./core";
import type { KeyManager } from "./manager";

export const ENCRYPTED_FIELDS = {
  budgets: ["name", "account_name"],
  transactions: ["description"],
  goals: ["name", "description"],
  goal_transactions: ["description"],
  recurring_rules: ["description"],
  budget_accounts: ["name"],
  account_transfers: ["description"],
} as const;

export type EncryptedTable = keyof typeof ENCRYPTED_FIELDS;

type Row = Record<string, unknown>;

const isPlain = (v: unknown): v is string => typeof v === "string" && v !== "" && !isEncrypted(v);

export function createFieldCrypto(manager: KeyManager, supabase: SupabaseClient) {
  const keyFor = (budgetId: string) => manager.getBudgetKey(budgetId).catch(() => null);

  /** Chiffre en base les textes encore en clair (seulement s'ils n'ont pas changé entre-temps). */
  async function sweep(table: EncryptedTable, key: Uint8Array, rows: Row[]) {
    for (const row of rows) {
      const patch: Row = {};
      let query = supabase.from(table).update(patch).eq("id", row.id as string);
      for (const f of ENCRYPTED_FIELDS[table]) {
        const v = row[f];
        if (isPlain(v)) {
          patch[f] = manager.e2ee.encryptText(key, v);
          query = query.eq(f, v);
        }
      }
      try {
        await query;
      } catch {
        // Réessayé au prochain chargement.
      }
    }
  }

  return {
    keyFor,

    /** Chiffre les champs d'une ligne avant écriture (inchangée si la clé n'est pas disponible). */
    async encrypt<T extends object>(table: EncryptedTable, budgetId: string, row: T): Promise<T> {
      const key = await keyFor(budgetId);
      if (!key) return row;
      const out = { ...row } as Row;
      for (const f of ENCRYPTED_FIELDS[table]) {
        if (typeof out[f] === "string") out[f] = manager.e2ee.encryptText(key, out[f] as string);
      }
      return out as T;
    },

    /** Déchiffre des lignes d'un même budget. */
    async decrypt<T extends object>(table: EncryptedTable, budgetId: string, rows: T[]): Promise<T[]> {
      if (!rows.length) return rows;
      const key = await keyFor(budgetId);
      const fields = ENCRYPTED_FIELDS[table];
      if (key) {
        const plain = (rows as Row[]).filter((r) => r.id && fields.some((f) => isPlain(r[f])));
        if (plain.length) void sweep(table, key, plain);
      }
      return rows.map((r) => {
        const out = { ...r } as Row;
        for (const f of fields) if (f in out) out[f] = manager.e2ee.decryptText(key, out[f] as string | null);
        return out as T;
      });
    },

    async decryptOne<T extends object>(table: EncryptedTable, budgetId: string, row: T): Promise<T> {
      return (await this.decrypt(table, budgetId, [row]))[0];
    },

    /** Budgets : chacun a sa propre clé. Transmet aussi la clé aux nouveaux membres. */
    async decryptBudgets<T extends { id: string; owner_type?: string }>(budgets: T[]): Promise<T[]> {
      return Promise.all(
        budgets.map(async (b) => {
          const [out] = await this.decrypt("budgets", b.id, [b]);
          if (b.owner_type === "group") void manager.shareBudgetKey(b.id).catch(() => 0);
          return out;
        }),
      );
    },
  };
}

export type FieldCrypto = ReturnType<typeof createFieldCrypto>;
