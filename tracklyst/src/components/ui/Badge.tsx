import { Colors } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";

export type BadgeTone = "neutral" | "accent" | "danger" | "warning" | "success";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: c.surfaceAlt, fg: c.textMuted },
    accent: { bg: c.tintMuted, fg: isDark ? c.tint : "#047857" },
    danger: { bg: c.dangerMuted, fg: c.danger },
    warning: { bg: isDark ? "#451A03" : "#FEF3C7", fg: isDark ? "#F59E0B" : "#B45309" },
    success: { bg: c.tintMuted, fg: isDark ? c.tint : "#047857" },
  };
  const { bg, fg } = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
