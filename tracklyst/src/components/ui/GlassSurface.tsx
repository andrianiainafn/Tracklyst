import { Colors } from "@/constants/theme";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

/**
 * Translucent blurred surface — reserved for elements that float above
 * scrolling content (tab bar, pinned headers). Not for static content cards:
 * with nothing behind them, blur there only hurts legibility.
 */
export function GlassSurface({ children, style, intensity = 40 }: GlassSurfaceProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? "dark" : "light"}
      style={[styles.base, { borderColor: c.border }, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
