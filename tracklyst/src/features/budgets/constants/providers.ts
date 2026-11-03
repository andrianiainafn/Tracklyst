import type { ImageSourcePropType } from "react-native";
import type { AccountKind } from "./accountLabels";

/**
 * Marques reconnues (logo affiché à la place de l'icône générique).
 * Le nom saisi est comparé sans casse ni accents aux alias.
 */
export const PROVIDERS: { id: string; name: string; kind: AccountKind; logo: ImageSourcePropType; aliases: string[] }[] = [
  { id: "mvola", name: "MVola", kind: "mobile_money", logo: require("@/src/assets/providers/mvola.png"), aliases: ["mvola"] },
  {
    id: "orange-money",
    name: "Orange Money",
    kind: "mobile_money",
    logo: require("@/src/assets/providers/orange-money.png"),
    aliases: ["orange money", "orange"],
  },
  {
    id: "airtel-money",
    name: "Airtel Money",
    kind: "mobile_money",
    logo: require("@/src/assets/providers/airtel-money.png"),
    aliases: ["airtel"],
  },
  { id: "bni", name: "BNI Madagascar", kind: "bank", logo: require("@/src/assets/providers/bni.png"), aliases: ["bni"] },
  {
    id: "boa",
    name: "BOA Madagascar",
    kind: "bank",
    logo: require("@/src/assets/providers/boa.png"),
    aliases: ["boa", "bank of africa"],
  },
  {
    id: "bred",
    name: "BRED Madagasikara",
    kind: "bank",
    logo: require("@/src/assets/providers/bred.png"),
    aliases: ["bred"],
  },
  { id: "mcb", name: "MCB Madagascar", kind: "bank", logo: require("@/src/assets/providers/mcb.png"), aliases: ["mcb"] },
  {
    id: "cem",
    name: "Caisse d'Épargne de Madagascar",
    kind: "savings",
    logo: require("@/src/assets/providers/cem.png"),
    aliases: ["caisse d'epargne", "caisse depargne", "cem"],
  },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019]/g, "'")
    .trim();

/** Marque correspondant au nom saisi (« mvola », « BNI Analakely »…), sinon null. */
export function providerFor(name?: string | null) {
  if (!name) return null;
  const n = normalize(name);
  // Alias reconnu comme mot entier : « cem » ne correspond pas à « décembre ».
  const has = (a: string) => new RegExp(`(^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(n);
  return PROVIDERS.find((p) => p.aliases.some(has)) ?? null;
}
