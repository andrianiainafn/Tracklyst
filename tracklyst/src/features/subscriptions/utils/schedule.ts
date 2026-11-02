import type { Subscription } from "../types/subscription.types";

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/**
 * Échéance suivante d'un abonnement. Pour les fréquences mensuelles et
 * annuelles, on repart du jour de `start_date` : un abonnement du 31
 * tombe le 28/29 février puis revient au 31 mars (pas de dérive).
 */
export function nextOccurrenceAfter(
  sub: Pick<Subscription, "next_occurrence" | "frequency" | "interval" | "start_date">,
): string {
  const step = Math.max(1, sub.interval ?? 1);
  const cur = parse(sub.next_occurrence);

  if (sub.frequency === "daily" || sub.frequency === "weekly") {
    const days = sub.frequency === "daily" ? step : step * 7;
    return toISODate(new Date(cur.y, cur.m, cur.d + days));
  }

  const anchorDay = parse(sub.start_date).d;
  const months = sub.frequency === "yearly" ? step * 12 : step;
  const total = cur.m + months;
  const y = cur.y + Math.floor(total / 12);
  const m = total % 12;
  return toISODate(new Date(y, m, Math.min(anchorDay, daysInMonth(y, m))));
}

/** Coût ramené au mois, pour afficher un total comparable. */
export function monthlyCost(sub: Pick<Subscription, "amount" | "frequency" | "interval">): number {
  const amount = Number(sub.amount);
  const step = Math.max(1, sub.interval ?? 1);
  switch (sub.frequency) {
    case "daily":
      return (amount * 365) / 12 / step;
    case "weekly":
      return (amount * 52) / 12 / step;
    case "yearly":
      return amount / 12 / step;
    default:
      return amount / step;
  }
}

/** Nombre de jours entre aujourd'hui et la date (négatif = en retard). */
export function daysUntil(iso: string): number {
  const { y, m, d } = parse(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m, d).getTime() - today.getTime()) / 86_400_000);
}

export const FREQUENCY_LABELS: Record<Subscription["frequency"], string> = {
  daily: "jour",
  weekly: "semaine",
  monthly: "mois",
  yearly: "an",
};
