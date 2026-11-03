import { Radius } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { accountKind, accountLabel } from "../constants/accountLabels";

/** Étiquette « où est l'argent » (MVola, BNI…) ; rien si le budget n'en a pas. */
export function AccountBadge({ budget }: { budget: { account_kind?: string | null; account_name?: string | null } }) {
  const kind = accountKind(budget.account_kind);
  const label = accountLabel(budget);
  if (!kind || !label) return null;
  return (
    <View style={[styles.badge, { backgroundColor: kind.color + "1F" }]}>
      <MaterialCommunityIcons name={kind.icon} size={13} color={kind.color} />
      <Text style={[styles.text, { color: kind.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    maxWidth: 180,
  },
  text: { fontSize: 11, fontWeight: "800", flexShrink: 1 },
});
