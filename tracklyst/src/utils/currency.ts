/**
 * Formate un montant dans la devise du budget concerné (MGA, EUR, USD, ...).
 *
 * Intl.NumberFormat ne supporte pas MGA nativement sur React Native/Android,
 * donc on formate manuellement avec les conventions locales (séparateur de
 * milliers en espace fine, virgule pour les décimales) quelle que soit la
 * devise, et on n'accole que le symbole correspondant.
 *
 * Exemples :
 *   formatCurrency(1204)                → "1 204 Ar"
 *   formatCurrency(1204.5, "EUR")       → "1 204,50 €"
 *   formatCurrency(-5000, "USD")        → "-5 000 $"
 *   formatCurrencyCompact(1500000)      → "1,5M Ar"
 *   formatCurrencyCompact(2000000000, "EUR") → "2Mrd €"
 */

const THIN_SPACE = " "; // espace fine insécable — séparateur de milliers

// ─── Devises supportées ────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  MGA: "Ar",
  EUR: "€",
  USD: "$",
};

export function getCurrencySymbol(currency = "MGA"): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function groupThousands(n: number): string {
  return Math.floor(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

// ─── formatAmount ─────────────────────────────────────────────────────────────

/**
 * Formate uniquement le nombre (sans le symbole de devise) — utile quand
 * le symbole est déjà affiché séparément dans l'UI (ex: pavé numérique).
 */
export const formatAmount = (amount: number, decimals = 2): string => {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  const intStr = groupThousands(abs);

  const decValue = Math.round((abs % 1) * 10 ** decimals);
  const decStr =
    decValue > 0 ? "," + decValue.toString().padStart(decimals, "0") : "";

  return `${sign}${intStr}${decStr}`;
};

// ─── formatCurrency ───────────────────────────────────────────────────────────

/**
 * Formate un nombre dans la devise donnée.
 * Affiche les centimes seulement s'ils sont non nuls.
 */
export const formatCurrency = (
  amount: number,
  currency = "MGA",
  decimals = 2,
): string => {
  const symbol = getCurrencySymbol(currency);
  return `${formatAmount(amount, decimals)}${THIN_SPACE}${symbol}`;
};

// ─── formatCurrencyCompact ────────────────────────────────────────────────────

/**
 * Version compacte pour les grands montants.
 *
 *   ≥ 1 000 000 000  →  "1,2Mrd Ar"
 *   ≥ 1 000 000      →  "1,2M Ar"
 *   ≥ 1 000          →  "1,2k Ar"
 *   < 1 000          →  formatCurrency() normal
 */
export const formatCurrencyCompact = (
  amount: number,
  currency = "MGA",
): string => {
  const symbol = getCurrencySymbol(currency);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  const fmt = (val: number, suffix: string): string => {
    const rounded = Math.round(val * 10) / 10;
    const intPart = Math.floor(rounded);
    const decPart = Math.round((rounded - intPart) * 10);
    const decStr = decPart > 0 ? `,${decPart}` : "";
    return `${sign}${intPart}${decStr}${suffix}${THIN_SPACE}${symbol}`;
  };

  if (abs >= 1_000_000_000) return fmt(abs / 1_000_000_000, "Mrd");
  if (abs >= 1_000_000) return fmt(abs / 1_000_000, "M");
  if (abs >= 1_000) return fmt(abs / 1_000, "k");

  return formatCurrency(amount, currency);
};
