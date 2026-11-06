import type { CategoryIconName } from "./categoryIcons";

/** Icônes proposées dans le formulaire de catégorie. */
export const EXPENSE_ICON_CHOICES: CategoryIconName[] = [
  "cart-outline",
  "home-outline",
  "gas-station-outline",
  "car-outline",
  "bus",
  "silverware-fork-knife",
  "coffee-outline",
  "medical-bag",
  "autorenew",
  "cellphone",
  "wifi",
  "lightning-bolt-outline",
  "water-outline",
  "shield-check-outline",
  "gamepad-variant-outline",
  "television-play",
  "music-note",
  "dumbbell",
  "school-outline",
  "tshirt-crew-outline",
  "gift-outline",
  "airplane",
  "baby-face-outline",
  "paw-outline",
  "hammer-wrench",
  "bank-outline",
  "receipt-text-outline",
  "tag-outline",
  "dots-horizontal-circle-outline",
];

export const INCOME_ICON_CHOICES: CategoryIconName[] = [
  "cash-multiple",
  "wallet-outline",
  "briefcase-outline",
  "chart-line",
  "cash-plus",
  "hand-coin-outline",
  "piggy-bank-outline",
  "gift-outline",
  "home-outline",
  "bank-outline",
  "dots-horizontal-circle-outline",
];

/** Couleurs proposées (mêmes teintes que les catégories par défaut). */
export const CATEGORY_COLORS = [
  "#10B981",
  "#0EA5E9",
  "#3B82F6",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#06B6D4",
  "#64748B",
];

/** Catégories par défaut — identiques à celles créées à l'inscription (migration 00005). */
export const DEFAULT_CATEGORIES: {
  name: string;
  type: "income" | "expense";
  icon: CategoryIconName;
  color: string;
}[] = [
  { name: "Salaire", type: "income", icon: "cash-multiple", color: "#10B981" },
  { name: "Autre revenu", type: "income", icon: "wallet-outline", color: "#34D399" },
  { name: "Loyer", type: "expense", icon: "home-outline", color: "#EF4444" },
  { name: "Courses", type: "expense", icon: "cart-outline", color: "#F59E0B" },
  { name: "Transport", type: "expense", icon: "car-outline", color: "#3B82F6" },
  { name: "Essence", type: "expense", icon: "gas-station-outline", color: "#0EA5E9" },
  { name: "Abonnements", type: "expense", icon: "autorenew", color: "#8B5CF6" },
  { name: "Loisirs", type: "expense", icon: "gamepad-variant-outline", color: "#EC4899" },
  { name: "Restaurant", type: "expense", icon: "silverware-fork-knife", color: "#F97316" },
  { name: "Santé", type: "expense", icon: "medical-bag", color: "#06B6D4" },
  { name: "Cotisation familiale", type: "expense", icon: "account-group-outline", color: "#14B8A6" },
  { name: "Petites dépenses", type: "expense", icon: "receipt-text-outline", color: "#A855F7" },
  { name: "Autre dépense", type: "expense", icon: "dots-horizontal-circle-outline", color: "#64748B" },
];
