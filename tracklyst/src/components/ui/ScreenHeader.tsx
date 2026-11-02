import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

interface ScreenHeaderProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ icon, title, subtitle, right }: ScreenHeaderProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: c.tintMuted }]}>
        <Ionicons name={icon} size={22} color={c.tint} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: c.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
