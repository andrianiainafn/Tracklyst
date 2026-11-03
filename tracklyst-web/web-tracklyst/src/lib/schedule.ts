import type { Subscription } from "./types";
import { isoDate } from "./format";

// Même calcul que l'app mobile (src/features/subscriptions/utils/schedule.ts).

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Échéance suivante ; le jour de start_date sert d'ancre (31 → 28/29 février → 31 mars). */
export function nextOccurrenceAfter(
  sub: Pick<Subscription, "next_occurrence" | "frequency" | "interval" | "start_date">,
) {
  const step = Math.max(1, sub.interval ?? 1);
  const cur = parse(sub.next_occurrence);
  if (sub.frequency === "daily" || sub.frequency === "weekly") {
    const days = sub.frequency === "daily" ? step : step * 7;
    return isoDate(new Date(cur.y, cur.m, cur.d + days));
  }
  const anchor = parse(sub.start_date).d;
  const total = cur.m + (sub.frequency === "yearly" ? step * 12 : step);
  const y = cur.y + Math.floor(total / 12);
  const m = total % 12;
  return isoDate(new Date(y, m, Math.min(anchor, daysInMonth(y, m))));
}

export function monthlyCost(sub: Pick<Subscription, "amount" | "frequency" | "interval">) {
  const a = Number(sub.amount);
  const step = Math.max(1, sub.interval ?? 1);
  switch (sub.frequency) {
    case "daily":
      return (a * 365) / 12 / step;
    case "weekly":
      return (a * 52) / 12 / step;
    case "yearly":
      return a / 12 / step;
    default:
      return a / step;
  }
}
