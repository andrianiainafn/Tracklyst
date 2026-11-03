// Thèmes de budget : identiques à l'app mobile (budgetThemes.ts).

export interface BudgetTheme {
  id: string;
  from: string;
  to: string;
  label: string;
}

export const BUDGET_THEMES: BudgetTheme[] = [
  { id: "emerald", from: "#0D4F3C", to: "#10B981", label: "Émeraude" },
  { id: "indigo", from: "#1E1B4B", to: "#6366F1", label: "Indigo" },
  { id: "orange", from: "#7C2D12", to: "#F97316", label: "Orange" },
  { id: "cyan", from: "#164E63", to: "#0EA5E9", label: "Cyan" },
  { id: "rose", from: "#4C0519", to: "#F43F5E", label: "Rose" },
  { id: "violet", from: "#2E1065", to: "#8B5CF6", label: "Violet" },
];

/** Thème du budget ; repli déterministe sur l'id pour les anciens budgets sans thème. */
export function resolveBudgetTheme(budget: { id: string; theme?: string | null }): BudgetTheme {
  const found = budget.theme ? BUDGET_THEMES.find((t) => t.id === budget.theme) : undefined;
  if (found) return found;
  let hash = 0;
  for (let i = 0; i < budget.id.length; i++) hash = (hash * 31 + budget.id.charCodeAt(i)) >>> 0;
  return BUDGET_THEMES[hash % BUDGET_THEMES.length];
}
