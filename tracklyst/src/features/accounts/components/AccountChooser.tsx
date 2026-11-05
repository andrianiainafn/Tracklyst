import { Colors, Radius } from "@/constants/theme";
import { usePrivacyStore } from "@/src/features/privacy/store/privacyStore";
import { formatCurrency } from "@/src/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import type { Account } from "../types";
import { AccountIcon, accountName } from "./AccountIcon";

/** Choix du compte : puces avec logo, nom et solde. */
export function AccountChooser({
  accounts,
  balances,
  value,
  onChange,
  currency,
  exclude,
}: {
  accounts: Account[];
  balances: Record<string, number>;
  value: string | null;
  onChange: (id: string) => void;
  currency: string;
  exclude?: string | null;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const hidden = usePrivacyStore((s) => s.hidden);
  const list = accounts.filter((a) => !a.is_archived && a.id !== exclude);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {list.map((a) => {
        const selected = a.id === value;
        return (
          <Pressable
            key={a.id}
            onPress={() => onChange(a.id)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: c.surface, borderColor: selected ? c.tint : c.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <AccountIcon account={a} size={34} />
            <View style={{ maxWidth: 120 }}>
              <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
                {accountName(a)}
              </Text>
              <Text style={[styles.balance, { color: c.textMuted }]}>
                {hidden ? "•••••" : formatCurrency(Math.round(balances[a.id] ?? 0), currency)}
              </Text>
            </View>
            {selected && (
              <View style={[styles.check, { backgroundColor: c.tint }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingRight: 8, paddingTop: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    paddingRight: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    minWidth: 132,
  },
  name: { fontSize: 13, fontWeight: "700" },
  balance: { fontSize: 11, marginTop: 1 },
  check: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
