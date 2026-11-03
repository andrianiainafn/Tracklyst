import { mdiBankOutline, mdiCash, mdiCellphone, mdiPiggyBankOutline, mdiWalletOutline } from "@mdi/js";

// Où se trouve l'argent d'un budget (identique au mobile : accountLabels.ts).

export type AccountKind = "mobile_money" | "bank" | "savings" | "cash" | "other";

export const ACCOUNT_KINDS: { id: AccountKind; label: string; icon: string; color: string; suggestions: string[] }[] = [
  { id: "mobile_money", label: "Mobile money", icon: mdiCellphone, color: "#F59E0B", suggestions: ["MVola", "Orange Money", "Airtel Money"] },
  {
    id: "bank",
    label: "Banque",
    icon: mdiBankOutline,
    color: "#3B82F6",
    suggestions: ["BNI Madagascar", "BOA Madagascar", "BRED Madagasikara", "MCB Madagascar", "BFV-SG", "BMOI", "Accès Banque", "BGFI Bank", "SBM Madagascar", "Baobab Banque"],
  },
  { id: "savings", label: "Épargne", icon: mdiPiggyBankOutline, color: "#10B981", suggestions: ["Caisse d'Épargne de Madagascar", "Livret d'épargne"] },
  { id: "cash", label: "Espèces", icon: mdiCash, color: "#64748B", suggestions: ["Portefeuille", "Coffre à la maison"] },
  { id: "other", label: "Autre", icon: mdiWalletOutline, color: "#8B5CF6", suggestions: [] },
];

export const accountKind = (id?: string | null) => ACCOUNT_KINDS.find((k) => k.id === id) ?? null;

/** Libellé affiché : le nom saisi, sinon le type (« Banque »). */
export function accountLabel(budget: { account_kind?: string | null; account_name?: string | null }) {
  const name = budget.account_name?.trim();
  if (name) return name;
  return accountKind(budget.account_kind)?.label ?? null;
}
