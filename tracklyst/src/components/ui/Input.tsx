import { Colors, Radius } from "@/constants/theme";
import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";

interface InputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  icon,
  rightElement,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.danger : focused ? c.tint : c.border;

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      )}
      <View
        style={[
          styles.wrap,
          { backgroundColor: c.surface, borderColor },
        ]}
      >
        {icon}
        <TextInput
          style={[styles.input, { color: c.text }, style]}
          placeholderTextColor={c.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightElement}
      </View>
      {error && (
        <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 6,
  },
});
