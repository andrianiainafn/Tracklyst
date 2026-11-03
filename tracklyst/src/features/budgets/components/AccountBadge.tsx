import { Radius } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { accountKind, accountLabel } from "../constants/accountLabels";
import { providerFor } from "../constants/providers";

/** Étiquette « où est l'argent » (MVola, BNI…) ; rien si le budget n'en a pas. */
export function AccountBadge({ budget }: { budget: { account_kind?: string | null; account_name?: string | null } }) {
  const kind = accountKind(budget.account_kind);
  const label = accountLabel(budget);
  if (!kind || !label) return null;
  const provider = providerFor(budget.account_name);
  return (
    <View style={[styles.badge, { backgroundColor: kind.color + "1F" }]}>
      {provider ? (
        <Image source={provider.logo} style={styles.logo} />
      ) : (
        <MaterialCommunityIcons name={kind.icon} size={13} color={kind.color} />
      )}
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
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    maxWidth: 180,
  },
  text: { fontSize: 11, fontWeight: "800", flexShrink: 1 },
  logo: { width: 16, height: 16, borderRadius: 4 },
});
