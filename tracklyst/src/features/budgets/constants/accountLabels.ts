import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type AccountKind = "mobile_money" | "bank" | "savings" | "cash" | "other";

/** Où se trouve l'argent d'un budget (identique au web : src/lib/accounts.ts). */
export const ACCOUNT_KINDS: {
  id: AccountKind;
  label: string;
  icon: IconName;
  color: string;
  suggestions: string[];
}[] = [
  {
    id: "mobile_money",
    label: "Mobile money",
    icon: "cellphone",
    color: "#F59E0B",
    suggestions: ["MVola", "Orange Money", "Airtel Money"],
  },
  {
    id: "bank",
    label: "Banque",
    icon: "bank-outline",
    color: "#3B82F6",
    suggestions: [
      "BNI Madagascar",
      "BOA Madagascar",
      "BFV-SG",
      "BMOI",
      "Accès Banque",
      "BGFI Bank",
      "SBM Madagascar",
      "Baobab Banque",
      "MCB Madagascar",
    ],
  },
  {
    id: "savings",
    label: "Épargne",
    icon: "piggy-bank-outline",
    color: "#10B981",
    suggestions: ["Caisse d'Épargne de Madagascar", "Livret d'épargne"],
  },
  { id: "cash", label: "Espèces", icon: "cash", color: "#64748B", suggestions: ["Portefeuille", "Coffre à la maison"] },
  { id: "other", label: "Autre", icon: "wallet-outline", color: "#8B5CF6", suggestions: [] },
];

export function accountKind(id?: string | null) {
  return ACCOUNT_KINDS.find((k) => k.id === id) ?? null;
}

/** Libellé affiché : le nom saisi, sinon le type (« Banque »). */
export function accountLabel(budget: { account_kind?: string | null; account_name?: string | null }) {
  const name = budget.account_name?.trim();
  if (name) return name;
  return accountKind(budget.account_kind)?.label ?? null;
}
