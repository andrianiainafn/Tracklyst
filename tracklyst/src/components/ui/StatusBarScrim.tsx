import { Colors } from "@/constants/theme";
import React from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Bandeau opaque derrière la barre d'état : le contenu qui défile ne
 * passe plus sous l'heure et les icônes système (affichage edge-to-edge).
 */
export function StatusBarScrim() {
  const isDark = useColorScheme() === "dark";
  const { top } = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: top,
        backgroundColor: (isDark ? Colors.dark : Colors.light).bg,
      }}
    />
  );
}
