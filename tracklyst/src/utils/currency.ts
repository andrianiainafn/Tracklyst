/**
 * Formate un montant en Ariary malgache (MGA).
 *
 * Intl.NumberFormat ne supporte pas MGA nativement sur React Native/Android,
 * donc on formate manuellement avec les conventions locales.
 *
 * Exemples :
 *   formatCurrency(1204)           → "1 204 Ar"
 *   formatCurrency(1204.5)         → "1 204,50 Ar"
 *   formatCurrency(-5000)          → "-5 000 Ar"
 *   formatCurrencyCompact(1500000) → "1,5M Ar"
 *   formatCurrencyCompact(2000000000) → "2Mrd Ar"
 */

const THIN_SPACE = "\u202F"; // espace fine insécable — séparateur de milliers

// ─── Helper ───────────────────────────────────────────────────────────────────

function groupThousands(n: number): string {
  return Math.floor(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

// ─── formatCurrency ───────────────────────────────────────────────────────────

/**
 * Formate un nombre en Ariary.
 * Affiche les centimes seulement s'ils sont non nuls.
 *
 * Les paramètres `_currency` et `_locale` sont conservés pour que
 * les appels existants `formatCurrency(amount, 'EUR', 'fr-FR')` continuent
 * de compiler sans modification — ils sont ignorés.
 */
export const formatCurrency = (
  amount: number,
  _currency = "MGA",
  _locale = "mg-MG",
  decimals = 2,
): string => {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  const intStr = groupThousands(abs);

  const decValue = Math.round((abs % 1) * 10 ** decimals);
  const decStr =
    decValue > 0 ? "," + decValue.toString().padStart(decimals, "0") : "";

  return `${sign}${intStr}${decStr}${THIN_SPACE}Ar`;
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
  _currency = "MGA",
  _locale = "mg-MG",
): string => {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  const fmt = (val: number, suffix: string): string => {
    const rounded = Math.round(val * 10) / 10;
    const intPart = Math.floor(rounded);
    const decPart = Math.round((rounded - intPart) * 10);
    const decStr = decPart > 0 ? `,${decPart}` : "";
    return `${sign}${intPart}${decStr}${suffix}${THIN_SPACE}Ar`;
  };

  if (abs >= 1_000_000_000) return fmt(abs / 1_000_000_000, "Mrd");
  if (abs >= 1_000_000) return fmt(abs / 1_000_000, "M");
  if (abs >= 1_000) return fmt(abs / 1_000, "k");

  return formatCurrency(amount);
};
