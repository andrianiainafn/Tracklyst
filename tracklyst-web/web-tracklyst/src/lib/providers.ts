import type { AccountKind } from "./accounts";

/**
 * Marques reconnues (logo affiché à la place de l'icône générique).
 * Identique au mobile : constants/providers.ts.
 */
export const PROVIDERS: { id: string; name: string; kind: AccountKind; logo: string; aliases: string[] }[] = [
  { id: "mvola", name: "MVola", kind: "mobile_money", logo: "/providers/mvola.png", aliases: ["mvola"] },
  { id: "orange-money", name: "Orange Money", kind: "mobile_money", logo: "/providers/orange-money.png", aliases: ["orange money", "orange"] },
  { id: "airtel-money", name: "Airtel Money", kind: "mobile_money", logo: "/providers/airtel-money.png", aliases: ["airtel"] },
  { id: "bni", name: "BNI Madagascar", kind: "bank", logo: "/providers/bni.png", aliases: ["bni"] },
  { id: "boa", name: "BOA Madagascar", kind: "bank", logo: "/providers/boa.png", aliases: ["boa", "bank of africa"] },
  { id: "bred", name: "BRED Madagasikara", kind: "bank", logo: "/providers/bred.png", aliases: ["bred"] },
  { id: "mcb", name: "MCB Madagascar", kind: "bank", logo: "/providers/mcb.png", aliases: ["mcb"] },
  {
    id: "cem",
    name: "Caisse d'Épargne de Madagascar",
    kind: "savings",
    logo: "/providers/cem.png",
    aliases: ["caisse d'epargne", "caisse depargne", "cem"],
  },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’]/g, "'")
    .trim();

/** Marque correspondant au nom saisi (« mvola », « BNI Analakely »…), sinon null. */
export function providerFor(name?: string | null) {
  if (!name) return null;
  const n = normalize(name);
  // Alias reconnu comme mot entier : « cem » ne correspond pas à « décembre ».
  const has = (a: string) => new RegExp(`(^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(n);
  return PROVIDERS.find((p) => p.aliases.some(has)) ?? null;
}
