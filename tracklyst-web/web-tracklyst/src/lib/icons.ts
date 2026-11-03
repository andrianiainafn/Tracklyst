import { CATEGORY_ICON_PATHS } from "./icon-paths";

// Même logique que l'app mobile (src/features/categories/constants/categoryIcons.ts).

const LEGACY_EMOJI: Record<string, string> = {
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

const KEYWORDS: [RegExp, string][] = [
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
  [/terrain|banque|frais bancaire|cr[ée]dit|pr[êe]t/, "bank-outline"],
  [/[ée]pargne/, "piggy-bank-outline"],
  [/salaire|paie/, "cash-multiple"],
  [/freelance|business|prestation/, "briefcase-outline"],
  [/investissement|dividende/, "chart-line"],
  [/revenu/, "wallet-outline"],
  [/autre/, "dots-horizontal-circle-outline"],
];

export function iconForLabel(label?: string | null): string | null {
  if (!label) return null;
  const text = label.toLowerCase();
  return KEYWORDS.find(([re]) => re.test(text))?.[1] ?? null;
}

/** Clé d'icône d'une catégorie : clé stockée, ancien emoji, déduite du nom, sinon défaut. */
export function resolveIconKey(c?: { icon?: string | null; name?: string | null; type?: string } | null) {
  const icon = c?.icon?.trim();
  if (icon) {
    if (CATEGORY_ICON_PATHS[icon]) return icon;
    if (LEGACY_EMOJI[icon]) return LEGACY_EMOJI[icon];
  }
  return iconForLabel(c?.name) ?? (c?.type === "income" ? "cash-plus" : "tag-outline");
}

export const iconPath = (key: string) => CATEGORY_ICON_PATHS[key] ?? CATEGORY_ICON_PATHS["tag-outline"];
