import { Colors, Radius, Shadow } from "@/constants/theme";
import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  padding?: number;
  elevated?: boolean;
}

export function Card({ style, padding = 16, elevated = true, children, ...rest }: CardProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          padding,
        },
        elevated && Shadow.sm,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

interface PressableCardProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  padding?: number;
  elevated?: boolean;
}

export function PressableCard({
  style,
  padding = 16,
  elevated = true,
  children,
  ...rest
}: PressableCardProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          padding,
        },
        elevated && Shadow.sm,
        pressed && styles.pressed,
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      {children as React.ReactNode}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
