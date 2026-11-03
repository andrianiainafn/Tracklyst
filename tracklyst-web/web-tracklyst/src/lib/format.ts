const THIN = " "; // espace fine insécable
const SYMBOLS: Record<string, string> = { MGA: "Ar", EUR: "€", USD: "$" };

export const currencySymbol = (currency = "MGA") => SYMBOLS[currency] ?? currency;

const group = (n: number) =>
  String(Math.floor(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, THIN);

/** Nombre seul, arrondi et groupé : "1 204". */
export const amountOnly = (amount: number) => {
  const r = Math.round(amount);
  return `${r < 0 ? "-" : ""}${group(r)}`;
};

/** Montant arrondi à l'unité : "1 204 Ar". */
export function money(amount: number, currency = "MGA") {
  const r = Math.round(amount);
  return `${r < 0 ? "-" : ""}${group(r)}${THIN}${currencySymbol(currency)}`;
}

/** Version compacte : "1,2M Ar", "350k Ar". */
export function moneyCompact(amount: number, currency = "MGA") {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const fmt = (v: number, s: string) => {
    const r = Math.round(v * 10) / 10;
    return `${sign}${String(r).replace(".", ",")}${s}${THIN}${currencySymbol(currency)}`;
  };
  if (abs >= 1e9) return fmt(abs / 1e9, "Mrd");
  if (abs >= 1e6) return fmt(abs / 1e6, "M");
  if (abs >= 1e3) return fmt(abs / 1e3, "k");
  return money(amount, currency);
}

/** Saisie utilisateur ("12 500,50") → nombre, ou 0. */
export function parseAmount(raw: string) {
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => isoDate(new Date());
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function monthRange(d = new Date()) {
  return {
    start: isoDate(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Jours entre aujourd'hui et la date (négatif = passé). */
export function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

export function dayLabel(iso: string) {
  const diff = -daysUntil(iso);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  const d = new Date(`${iso}T00:00:00`);
  return capitalize(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
}

export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
