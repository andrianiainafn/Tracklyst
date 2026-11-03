// Appelée par le trigger SQL à chaque nouvelle dépense : alerte quand la
// catégorie atteint 80 % de son plafond mensuel, puis quand il est dépassé.
import {
  adminClient,
  claim,
  formatAmount,
  isAuthorized,
  json,
  recipientsForBudget,
  sendPush,
} from "../_shared/push.ts";

const WARNING_RATIO = 0.8;

Deno.serve(async (req) => {
  if (!isAuthorized(req)) return json({ error: "unauthorized" }, 401);

  const { transaction_id } = await req.json().catch(() => ({}));
  if (!transaction_id) return json({ error: "transaction_id manquant" }, 400);

  const sb = adminClient();
  const { data: tx } = await sb
    .from("transactions")
    .select("budget_id, category_id, type, date")
    .eq("id", transaction_id)
    .single();
  if (!tx || tx.type !== "expense") return json({ skipped: "not an expense" });

  const { data: cat } = await sb
    .from("categories")
    .select("id, name, monthly_limit")
    .eq("id", tx.category_id)
    .single();
  const limit = Number(cat?.monthly_limit ?? 0);
  if (!cat || limit <= 0) return json({ skipped: "no limit" });

  // Dépenses du mois de la transaction dans cette catégorie.
  const month = tx.date.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const { data: rows, error } = await sb
    .from("transactions")
    .select("amount")
    .eq("budget_id", tx.budget_id)
    .eq("category_id", cat.id)
    .eq("type", "expense")
    .gte("date", `${month}-01`)
    .lte("date", `${month}-${String(lastDay).padStart(2, "0")}`);
  if (error) return json({ error: error.message }, 500);

  const spent = (rows ?? []).reduce((acc, r) => acc + Number(r.amount), 0);
  const ratio = spent / limit;
  if (ratio < WARNING_RATIO) return json({ skipped: "below threshold", ratio });

  const over = ratio > 1;
  const level = over ? "over" : "warning";
  const base = `limit:${cat.id}:${month}`;
  if (!(await claim(sb, `${base}:${level}`))) return json({ skipped: "already sent" });
  // Dépassement direct : pas d'alerte « 80 % » ensuite pour ce mois.
  if (over) await claim(sb, `${base}:warning`);

  const { tokens, currency } = await recipientsForBudget(sb, tx.budget_id);
  const sent = await sendPush(
    sb,
    tokens.map((to) => ({
      to,
      title: over ? `Plafond ${cat.name} dépassé` : `${cat.name} : ${Math.round(ratio * 100)} % du plafond`,
      body: over
        ? `Dépassé de ${formatAmount(spent - limit, currency)} ce mois-ci.`
        : `Il vous reste ${formatAmount(limit - spent, currency)} sur ${formatAmount(limit, currency)}.`,
      data: { url: "/(tabs)" },
    })),
  );
  return json({ level, ratio, sent });
});
