import { useColorScheme as useSystemColorScheme } from "react-native";
import { useThemeStore } from "@/src/features/theme/themeStore";

/**
 * Thème effectif de l'app : celui du téléphone (ou du navigateur), sauf si
 * l'utilisateur a choisi Clair ou Sombre dans les Paramètres.
 * À utiliser partout à la place de useColorScheme de react-native.
 */
export function useColorScheme(): "light" | "dark" {
  const system = useSystemColorScheme();
  const mode = useThemeStore((s) => s.mode);
  if (mode === "light" || mode === "dark") return mode;
  return system === "dark" ? "dark" : "light";
}
