// Code partagé des fonctions push : client admin, destinataires,
// déduplication et envoi via l'Expo Push Service.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Fuseau des rappels (les montants sont en Ariary). */
export const TIMEZONE = "Indian/Antananarivo";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHANNEL_ID = "reminders"; // créé par l'app (localNotifications.ts)

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Seuls le cron et le trigger (qui connaissent le secret) peuvent appeler. */
export function isAuthorized(req: Request): boolean {
  const expected = Deno.env.get("PUSH_CRON_SECRET");
  return !!expected && req.headers.get("x-push-secret") === expected;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Date du jour ("YYYY-MM-DD") dans le fuseau des rappels, décalée de n jours. */
export function dateIn(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

const SYMBOLS: Record<string, string> = { MGA: "Ar", EUR: "€", USD: "$" };

export function formatAmount(amount: number, currency = "MGA"): string {
  const rounded = Math.round(Math.abs(amount));
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${amount < 0 ? "-" : ""}${grouped} ${SYMBOLS[currency] ?? currency}`;
}

type BudgetRecipients = { tokens: string[]; currency: string };

/** Jetons des personnes qui ont accès au budget (propriétaire ou membres du groupe). */
export async function recipientsForBudget(
  sb: SupabaseClient,
  budgetId: string,
  cache = new Map<string, BudgetRecipients>(),
): Promise<BudgetRecipients> {
  const cached = cache.get(budgetId);
  if (cached) return cached;

  const { data: budget } = await sb
    .from("budgets")
    .select("owner_type, owner_id, currency")
    .eq("id", budgetId)
    .single();
  if (!budget) return { tokens: [], currency: "MGA" };

  let userIds: string[] = [budget.owner_id];
  if (budget.owner_type === "group") {
    const { data: members } = await sb
      .from("group_members")
      .select("user_id")
      .eq("group_id", budget.owner_id);
    userIds = (members ?? []).map((m) => m.user_id);
  }

  const { data: rows } = await sb
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const result = { tokens: (rows ?? []).map((r) => r.token), currency: budget.currency };
  cache.set(budgetId, result);
  return result;
}

/**
 * Réserve une clé d'envoi. Retourne false si l'alerte a déjà été envoyée :
 * chaque rappel / alerte part au plus une fois, même si la fonction est
 * rappelée.
 */
export async function claim(sb: SupabaseClient, key: string): Promise<boolean> {
  const { error } = await sb.from("push_log").insert({ key });
  if (!error) return true;
  if (error.code === "23505") return false; // déjà envoyé
  throw error;
}

/** Envoie par lots de 100 ; supprime les jetons des appareils désinstallés. */
export async function sendPush(sb: SupabaseClient, messages: PushMessage[]) {
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({
      ...m,
      sound: "default",
      priority: "high",
      channelId: CHANNEL_ID,
    }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error("Expo push error", res.status, await res.text());
      continue;
    }
    const { data: tickets = [] } = await res.json();
    const dead: string[] = [];
    tickets.forEach((t: { status: string; details?: { error?: string } }, idx: number) => {
      if (t.status === "ok") sent++;
      else if (t.details?.error === "DeviceNotRegistered") dead.push(chunk[idx].to);
      else console.error("Expo ticket error", t);
    });
    if (dead.length) await sb.from("push_tokens").delete().in("token", dead);
  }
  return sent;
}

/**
 * Texte lisible dans une notification. Les textes chiffrés de bout en bout
 * (« e1:… ») sont illisibles pour le serveur : on utilise alors le libellé neutre.
 */
export function readable(text: string | null | undefined, fallback: string) {
  return text && !text.startsWith("e1:") ? text : fallback;
}
