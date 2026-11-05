import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { usePrivacyStore } from "../store/privacyStore";

/** Bouton œil : affiche / masque les soldes. */
export function PrivacyToggle({ size = 18 }: { size?: number }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { hidden, toggle } = usePrivacyStore();

  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={hidden ? "Afficher le solde" : "Masquer le solde"}
      style={({ pressed }) => [styles.btn, { backgroundColor: c.surfaceAlt }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={size} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
