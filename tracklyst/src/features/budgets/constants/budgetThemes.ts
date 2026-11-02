export interface BudgetTheme {
  id: string;
  from: string;
  to: string;
  accent: string;
  label: string;
}

export const BUDGET_THEMES: BudgetTheme[] = [
  { id: "emerald", from: "#0D4F3C", to: "#10B981", accent: "#34D399", label: "Émeraude" },
  { id: "indigo", from: "#1E1B4B", to: "#6366F1", accent: "#A5B4FC", label: "Indigo" },
  { id: "orange", from: "#7C2D12", to: "#F97316", accent: "#FED7AA", label: "Orange" },
  { id: "cyan", from: "#164E63", to: "#0EA5E9", accent: "#BAE6FD", label: "Cyan" },
  { id: "rose", from: "#4C0519", to: "#F43F5E", accent: "#FECDD3", label: "Rose" },
  { id: "violet", from: "#2E1065", to: "#8B5CF6", accent: "#DDD6FE", label: "Violet" },
];

export const DEFAULT_BUDGET_THEME_ID = BUDGET_THEMES[0].id;

/**
 * Déterministe à partir de l'id du budget — utilisé en repli pour les
 * budgets créés avant l'ajout de la colonne `theme` (valeur absente).
 * Contrairement à un index de liste, ce choix ne change jamais pour un
 * budget donné, quel que soit l'ordre de la liste.
 */
function themeForBudgetId(id: string): BudgetTheme {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return BUDGET_THEMES[hash % BUDGET_THEMES.length];
}

export function resolveBudgetTheme(budget: {
  id: string;
  theme?: string | null;
}): BudgetTheme {
  const found = budget.theme
    ? BUDGET_THEMES.find((t) => t.id === budget.theme)
    : undefined;
  return found ?? themeForBudgetId(budget.id);
}
