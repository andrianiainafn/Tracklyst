import { supabase } from "@/src/lib/supabase";

export interface BudgetMember {
  user_id: string;
  display_name: string;
  email: string | null;
  role: "owner" | "admin" | "member";
  joined_at: string;
  is_me: boolean;
}

/** Messages lisibles pour les erreurs levées par les fonctions SQL (migration 00008). */
const MESSAGES: Record<string, string> = {
  invalid_code: "Ce code ne correspond à aucun budget. Vérifiez les 6 caractères.",
  not_owner: "Seul le propriétaire du budget peut faire cela.",
  owner_cannot_leave: "Vous êtes le propriétaire : retirez d'abord les autres membres.",
  cannot_remove_self: "Vous ne pouvez pas vous retirer vous-même.",
  forbidden: "Vous n'avez pas accès à ce budget.",
  budget_not_found: "Budget introuvable.",
  not_authenticated: "Session expirée : reconnectez-vous.",
};

function fail(error: { message?: string }): never {
  const key = Object.keys(MESSAGES).find((k) => error.message?.includes(k));
  throw new Error(key ? MESSAGES[key] : error.message || "Une erreur est survenue.");
}

/** Normalise une saisie (espaces, tirets, minuscules) en code de 6 caractères. */
export const normalizeShareCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export const sharingService = {
  /** Code d'invitation du budget (le budget devient partagé au premier appel). */
  async getShareCode(budgetId: string, renew = false): Promise<string> {
    const { data, error } = await supabase.rpc("share_budget", { p_budget_id: budgetId, p_renew: renew });
    if (error) fail(error);
    return data as string;
  },

  /** Rejoint un budget ; retourne son id. */
  async join(code: string): Promise<string> {
    const { data, error } = await supabase.rpc("join_budget", { p_code: normalizeShareCode(code) });
    if (error) fail(error);
    return data as string;
  },

  async members(budgetId: string): Promise<BudgetMember[]> {
    const { data, error } = await supabase.rpc("budget_members", { p_budget_id: budgetId });
    if (error) fail(error);
    return (data ?? []) as BudgetMember[];
  },

  async removeMember(budgetId: string, userId: string) {
    const { error } = await supabase.rpc("remove_budget_member", { p_budget_id: budgetId, p_user_id: userId });
    if (error) fail(error);
  },

  async leave(budgetId: string) {
    const { error } = await supabase.rpc("leave_budget", { p_budget_id: budgetId });
    if (error) fail(error);
  },
};
