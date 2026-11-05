import { Colors, Radius } from "@/constants/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeStore, type ThemeMode } from "./themeStore";

const MODES: { id: ThemeMode; label: string; icon: ComponentProps<typeof MaterialCommunityIcons>["name"] }[] = [
  { id: "system", label: "Automatique", icon: "theme-light-dark" },
  { id: "light", label: "Clair", icon: "white-balance-sunny" },
  { id: "dark", label: "Sombre", icon: "weather-night" },
];

/** Choix de l'apparence : comme l'appareil, clair ou sombre. */
export function ThemeModePicker() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { mode, setMode } = useThemeStore();

  return (
    <View style={styles.row}>
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <Pressable
            key={m.id}
            onPress={() => setMode(m.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: active ? c.tintMuted : c.surface, borderColor: active ? c.tint : c.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialCommunityIcons name={m.icon} size={22} color={active ? c.tint : c.textMuted} />
            <Text style={[styles.label, { color: active ? c.text : c.textMuted }]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1.5 },
  label: { fontSize: 13, fontWeight: "700" },
});
