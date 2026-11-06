import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type CategoryIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export const DEFAULT_EXPENSE_ICON: CategoryIconName = "tag-outline";
export const DEFAULT_INCOME_ICON: CategoryIconName = "cash-plus";
export const DEFAULT_CATEGORY_COLOR = "#64748B";

/**
 * Anciennes valeurs de `categories.icon` (emojis des catégories par
 * défaut) → icône. Garde l'affichage correct tant que la migration
 * 00005 n'a pas converti les données.
 */
const LEGACY_EMOJI: Record<string, CategoryIconName> = {
  "💰": "cash-multiple",
  "💵": "wallet-outline",
  "🏠": "home-outline",
  "🛒": "cart-outline",
  "🚗": "car-outline",
  "⛽": "gas-station-outline",
  "📱": "autorenew",
  "🎮": "gamepad-variant-outline",
  "🍽️": "silverware-fork-knife",
  "🍽": "silverware-fork-knife",
  "💊": "medical-bag",
  "🧾": "receipt-text-outline",
  "💸": "dots-horizontal-circle-outline",
  "💳": "credit-card-outline",
};

/**
 * Mots-clés (nom de catégorie ou libellé d'abonnement) → icône.
 * Ordre important : le premier qui correspond gagne.
 */
const KEYWORDS: [RegExp, CategoryIconName][] = [
  [/essence|carbur|gasoil|diesel/, "gas-station-outline"],
  [/netflix|canal|prime video|disney|tv|télé/, "television-play"],
  [/spotify|deezer|musique|music/, "music-note"],
  [/internet|wifi|fibre|box/, "wifi"],
  [/t[ée]l[ée]phone|mobile|forfait|airtel|orange|telma/, "cellphone"],
  [/[ée]lectricit[ée]|jirama|[ée]nergie/, "lightning-bolt-outline"],
  [/\beau\b/, "water-outline"],
  [/assurance/, "shield-check-outline"],
  [/sport|gym|salle/, "dumbbell"],
  [/cloud|icloud|drive|stockage/, "cloud-outline"],
  [/abonnement/, "autorenew"],
  [/cotisation|famil/, "account-group-outline"],
  [/petite|divers|menu/, "receipt-text-outline"],
  [/course|supermarch|march[ée]|alimenta/, "cart-outline"],
  [/loyer|maison|logement/, "home-outline"],
  [/transport|taxi|bus|train/, "bus"],
  [/voiture|auto|garage|parking/, "car-outline"],
  [/resto|restaurant|repas|caf[ée]/, "silverware-fork-knife"],
  [/sant[ée]|pharma|m[ée]dec|docteur|h[ôo]pital/, "medical-bag"],
  [/loisir|jeu|sortie/, "gamepad-variant-outline"],
  [/[ée]cole|scolar|[ée]tude|formation/, "school-outline"],
  [/v[êe]tement|habit|mode/, "tshirt-crew-outline"],
  [/cadeau|don\b/, "gift-outline"],
  [/voyage|vacance|avion/, "airplane"],
  [/enfant|b[ée]b[ée]/, "baby-face-outline"],
  [/animal|chien|chat/, "paw-outline"],
  [/travaux|r[ée]paration|bricol/, "hammer-wrench"],
  [/banque|frais bancaire|cr[ée]dit|pr[êe]t/, "bank-outline"],
  [/[ée]pargne/, "piggy-bank-outline"],
  [/salaire|paie/, "cash-multiple"],
  [/freelance|business|prestation/, "briefcase-outline"],
  [/investissement|dividende/, "chart-line"],
  [/revenu/, "wallet-outline"],
  [/autre/, "dots-horizontal-circle-outline"],
];

export function iconForLabel(label?: string | null): CategoryIconName | null {
  if (!label) return null;
  const text = label.toLowerCase();
  return KEYWORDS.find(([re]) => re.test(text))?.[1] ?? null;
}

const isIconKey = (icon: string) => /^[a-z0-9-]+$/.test(icon);

/**
 * Icône d'une catégorie : clé d'icône stockée en base, sinon ancien emoji
 * converti, sinon déduite du nom, sinon icône par défaut.
 */
export function resolveCategoryIcon(category?: {
  icon?: string | null;
  name?: string | null;
  type?: "income" | "expense";
} | null): CategoryIconName {
  const icon = category?.icon?.trim();
  if (icon) {
    if (isIconKey(icon)) return icon as CategoryIconName;
    if (LEGACY_EMOJI[icon]) return LEGACY_EMOJI[icon];
  }
  return (
    iconForLabel(category?.name) ??
    (category?.type === "income" ? DEFAULT_INCOME_ICON : DEFAULT_EXPENSE_ICON)
  );
}
