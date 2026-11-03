/**
 * Gestion des clés de chiffrement de bout en bout — commun mobile / web
 * (copie identique : tracklyst-web/web-tracklyst/src/lib/e2ee/manager.ts).
 *
 * États : « setup » (jamais activé) → l'utilisateur choisit un code secret ;
 * « locked » (activé, clé absente de cet appareil) → code ou clé de secours ;
 * « unlocked » → la clé privée est en mémoire et sur l'appareil.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createE2ee, fromB64, normalizeRecoveryKey, toB64, type RandomBytes } from "./core";

export type E2eeStatus = "idle" | "loading" | "setup" | "locked" | "unlocked";

export interface KeyStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

interface UserKeysRow {
  user_id: string;
  public_key: string;
  private_key_by_code: string;
  code_salt: string;
  private_key_by_recovery: string;
  recovery_salt: string;
}

export function createKeyManager({
  supabase,
  storage,
  random,
}: {
  supabase: SupabaseClient;
  storage: KeyStorage;
  random: RandomBytes;
}) {
  const e2ee = createE2ee(random);
  let status: E2eeStatus = "idle";
  let userId: string | null = null;
  let privateKey: Uint8Array | null = null;
  const budgetKeys = new Map<string, Uint8Array>();
  const pending = new Map<string, Promise<Uint8Array | null>>();
  const listeners = new Set<(s: E2eeStatus) => void>();
  // Lectures en attente du déverrouillage (l'écran de verrouillage est affiché).
  let unlockWaiters: (() => void)[] = [];
  const whenUnlocked = () =>
    status === "unlocked" ? Promise.resolve() : new Promise<void>((resolve) => unlockWaiters.push(resolve));

  // Lettres, chiffres, « . », « - » et « _ » seulement (contrainte du stockage sécurisé mobile).
  const storageKey = (uid: string) => `tracklyst_e2ee_v1_${uid}`;
  const setStatus = (s: E2eeStatus) => {
    status = s;
    if (s === "unlocked") {
      unlockWaiters.forEach((resolve) => resolve());
      unlockWaiters = [];
    }
    listeners.forEach((l) => l(s));
  };

  async function fetchRow(uid: string): Promise<UserKeysRow | null> {
    const { data, error } = await supabase.from("user_keys").select("*").eq("user_id", uid).maybeSingle();
    if (error) throw error;
    return (data as UserKeysRow) ?? null;
  }

  async function remember(uid: string, key: Uint8Array) {
    privateKey = key;
    await storage.set(storageKey(uid), toB64(key));
    setStatus("unlocked");
  }

  return {
    e2ee,
    get status() {
      return status;
    },
    whenUnlocked,
    subscribe(listener: (s: E2eeStatus) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** À appeler à chaque connexion. */
    async init(uid: string) {
      if (userId === uid && (status === "unlocked" || status === "loading")) return;
      userId = uid;
      privateKey = null;
      budgetKeys.clear();
      setStatus("loading");
      const row = await fetchRow(uid);
      if (!row) {
        await storage.remove(storageKey(uid));
        return setStatus("setup");
      }
      const stored = await storage.get(storageKey(uid));
      if (stored) {
        const key = fromB64(stored);
        // La clé de l'appareil doit correspondre à la clé publique du compte.
        if (e2ee.publicKeyOf(key) === row.public_key) {
          privateKey = key;
          return setStatus("unlocked");
        }
        await storage.remove(storageKey(uid));
      }
      setStatus("locked");
    },

    /** Première activation : retourne la clé de secours (à afficher une seule fois). */
    async setup(code: string): Promise<string> {
      if (!userId) throw new Error("Non connecté.");
      const { privateKey: key, publicKey } = e2ee.generateKeyPair();
      const recoveryKey = e2ee.newRecoveryKey();
      const byCode = await e2ee.protectPrivateKey(key, code);
      const byRecovery = await e2ee.protectPrivateKey(key, recoveryKey);
      const { error } = await supabase.from("user_keys").insert({
        user_id: userId,
        public_key: publicKey,
        private_key_by_code: byCode.encrypted,
        code_salt: byCode.salt,
        private_key_by_recovery: byRecovery.encrypted,
        recovery_salt: byRecovery.salt,
      });
      if (error) throw error;
      await remember(userId, key);
      return recoveryKey;
    },

    /** Lève « Code incorrect » si le code est faux. */
    async unlockWithCode(code: string) {
      if (!userId) throw new Error("Non connecté.");
      const row = await fetchRow(userId);
      if (!row) throw new Error("Chiffrement non activé.");
      try {
        await remember(userId, await e2ee.unprotectPrivateKey(row.private_key_by_code, row.code_salt, code));
      } catch {
        throw new Error("Code incorrect.");
      }
    },

    async unlockWithRecovery(recoveryKey: string) {
      if (!userId) throw new Error("Non connecté.");
      const row = await fetchRow(userId);
      if (!row) throw new Error("Chiffrement non activé.");
      try {
        const key = await e2ee.unprotectPrivateKey(
          row.private_key_by_recovery,
          row.recovery_salt,
          normalizeRecoveryKey(recoveryKey),
        );
        await remember(userId, key);
      } catch {
        throw new Error("Clé de secours incorrecte.");
      }
    },

    /** Nouveau code secret (appareil déverrouillé, ex. après la clé de secours). */
    async changeCode(newCode: string) {
      if (!userId || !privateKey) throw new Error("Déverrouillez d'abord vos données.");
      const byCode = await e2ee.protectPrivateKey(privateKey, newCode);
      const { error } = await supabase
        .from("user_keys")
        .update({ private_key_by_code: byCode.encrypted, code_salt: byCode.salt })
        .eq("user_id", userId);
      if (error) throw error;
    },

    /** Déconnexion : la clé quitte la mémoire et l'appareil. */
    async lock() {
      if (userId) await storage.remove(storageKey(userId));
      privateKey = null;
      userId = null;
      budgetKeys.clear();
      setStatus("idle");
    },

    /**
     * Clé du budget. Créée par le propriétaire si personne ne l'a encore ;
     * null si un autre membre doit d'abord la transmettre (budget partagé).
     */
    getBudgetKey(budgetId: string): Promise<Uint8Array | null> {
      const cached = budgetKeys.get(budgetId);
      if (cached) return Promise.resolve(cached);
      const inFlight = pending.get(budgetId);
      if (inFlight) return inFlight;

      const task = (async () => {
        await whenUnlocked();
        if (!userId || !privateKey) return null;
        const load = async () => {
          const { data } = await supabase
            .from("budget_keys")
            .select("wrapped_key")
            .eq("budget_id", budgetId)
            .eq("user_id", userId!)
            .maybeSingle();
          if (!data) return null;
          const key = e2ee.unwrapBudgetKey(data.wrapped_key, privateKey!);
          budgetKeys.set(budgetId, key);
          return key;
        };

        const existing = await load();
        if (existing) return existing;

        const { data: members, error } = await supabase.rpc("budget_key_status", { p_budget_id: budgetId });
        if (error) throw error;
        const rows = (members ?? []) as { user_id: string; role: string; public_key: string | null; has_key: boolean }[];
        const me = rows.find((r) => r.user_id === userId);
        if (rows.some((r) => r.has_key) || me?.role !== "owner") return null;

        // Propriétaire, personne n'a la clé : on la crée et on l'emballe pour chaque membre équipé.
        const key = e2ee.newBudgetKey();
        const inserts = rows
          .filter((r) => r.public_key)
          .map((r) => ({
            budget_id: budgetId,
            user_id: r.user_id,
            wrapped_key: e2ee.wrapBudgetKey(key, r.public_key!),
            created_by: userId,
          }));
        const mine = inserts.find((r) => r.user_id === userId);
        if (!mine) return null;
        const { error: insertError } = await supabase.from("budget_keys").insert(mine);
        // Un autre appareil vient de la créer : on lit la sienne.
        if (insertError) return insertError.code === "23505" ? load() : Promise.reject(insertError);
        const others = inserts.filter((r) => r.user_id !== userId);
        if (others.length) await supabase.from("budget_keys").insert(others);
        budgetKeys.set(budgetId, key);
        return key;
      })().finally(() => pending.delete(budgetId));

      pending.set(budgetId, task);
      return task;
    },

    /** Transmet la clé du budget aux membres qui ne l'ont pas encore. */
    async shareBudgetKey(budgetId: string) {
      const key = budgetKeys.get(budgetId);
      if (!key || !userId) return 0;
      const { data, error } = await supabase.rpc("budget_key_status", { p_budget_id: budgetId });
      if (error) return 0;
      const missing = ((data ?? []) as { user_id: string; public_key: string | null; has_key: boolean }[]).filter(
        (r) => !r.has_key && r.public_key,
      );
      if (!missing.length) return 0;
      await supabase.from("budget_keys").insert(
        missing.map((r) => ({
          budget_id: budgetId,
          user_id: r.user_id,
          wrapped_key: e2ee.wrapBudgetKey(key, r.public_key!),
          created_by: userId,
        })),
      );
      return missing.length;
    },

    /**
     * Nouveau budget : la clé est créée avant l'insertion, pour que le nom
     * parte déjà chiffré. Appeler registerBudgetKey une fois le budget créé.
     */
    newBudgetKey: () => e2ee.newBudgetKey(),

    async registerBudgetKey(budgetId: string, key: Uint8Array) {
      if (!userId || !privateKey) throw new Error("Déverrouillez d'abord vos données.");
      const { error } = await supabase.from("budget_keys").insert({
        budget_id: budgetId,
        user_id: userId,
        wrapped_key: e2ee.wrapBudgetKey(key, e2ee.publicKeyOf(privateKey)),
        created_by: userId,
      });
      if (error) throw error;
      budgetKeys.set(budgetId, key);
    },

    /** Clé déjà chargée (synchrone), pour déchiffrer à l'affichage. */
    cachedBudgetKey: (budgetId: string) => budgetKeys.get(budgetId) ?? null,
  };
}

export type KeyManager = ReturnType<typeof createKeyManager>;
