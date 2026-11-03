// Cron quotidien (09:00 Madagascar) : prélèvements du jour et échéances
// d'objectifs (J-7 et jour J).
import {
  adminClient,
  claim,
  dateIn,
  formatAmount,
  isAuthorized,
  json,
  recipientsForBudget,
  sendPush,
  type PushMessage,
} from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (!isAuthorized(req)) return json({ error: "unauthorized" }, 401);

  const sb = adminClient();
  const today = dateIn(0);
  const inAWeek = dateIn(7);
  const cache = new Map();
  const messages: PushMessage[] = [];

  // ── Abonnements dus aujourd'hui ──
  const { data: subs, error: subsError } = await sb
    .from("recurring_rules")
    .select("id, budget_id, amount, description, next_occurrence")
    .eq("is_active", true)
    .eq("type", "expense")
    .eq("next_occurrence", today);
  if (subsError) return json({ error: subsError.message }, 500);

  for (const s of subs ?? []) {
    if (!(await claim(sb, `sub:${s.id}:${s.next_occurrence}`))) continue;
    const { tokens, currency } = await recipientsForBudget(sb, s.budget_id, cache);
    for (const to of tokens) {
      messages.push({
        to,
        title: "Prélèvement aujourd'hui",
        body: `${s.description ?? "Abonnement"} · ${formatAmount(Number(s.amount), currency)}. Validez-le ou ignorez-le dans Tracklyst.`,
        data: { url: "/(tabs)" },
      });
    }
  }

  // ── Objectifs : J-7 et jour J ──
  const { data: goals, error: goalsError } = await sb
    .from("goals")
    .select("id, budget_id, name, target_amount, current_amount, deadline")
    .eq("status", "in_progress")
    .in("deadline", [today, inAWeek]);
  if (goalsError) return json({ error: goalsError.message }, 500);

  for (const g of goals ?? []) {
    const remaining = Number(g.target_amount) - Number(g.current_amount);
    if (remaining <= 0) continue;
    const due = g.deadline === today;
    if (!(await claim(sb, `goal:${g.id}:${due ? "due" : "soon"}:${g.deadline}`))) continue;
    const { tokens, currency } = await recipientsForBudget(sb, g.budget_id, cache);
    for (const to of tokens) {
      messages.push({
        to,
        title: due ? "Échéance aujourd'hui" : "Échéance dans 7 jours",
        body: `« ${g.name} » : il reste ${formatAmount(remaining, currency)} à mettre de côté.`,
        data: { url: "/(tabs)/goals" },
      });
    }
  }

  const sent = await sendPush(sb, messages);
  return json({ date: today, queued: messages.length, sent });
});
