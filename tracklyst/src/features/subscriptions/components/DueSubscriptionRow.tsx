import { Colors, Radius } from "@/constants/theme";
import { formatCurrency } from "@/src/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import { iconForLabel } from "@/src/features/categories/constants/categoryIcons";
import type { Subscription } from "../types/subscription.types";
import { daysUntil } from "../utils/schedule";

const dueLabel = (iso: string) => {
  const d = daysUntil(iso);
  if (d === 0) return "Dû aujourd'hui";
  if (d === -1) return "Dû hier";
  return `En retard de ${-d} jours`;
};

/**
 * Échéance à valider : « Valider » enregistre la dépense, « Ignorer »
 * passe à la prochaine échéance sans rien débiter.
 */
export function DueSubscriptionRow({
  sub,
  currency,
  onConfirm,
  onSkip,
}: {
  sub: Subscription;
  currency: string;
  onConfirm: (sub: Subscription) => Promise<void>;
  onSkip: (sub: Subscription) => Promise<void>;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [busy, setBusy] = useState<"confirm" | "skip" | null>(null);
  const late = daysUntil(sub.next_occurrence) < 0;

  const run = async (action: "confirm" | "skip") => {
    try {
      setBusy(action);
      await (action === "confirm" ? onConfirm(sub) : onSkip(sub));
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Action impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.row, { backgroundColor: c.surfaceAlt }]}>
      <CategoryIcon category={sub.category} icon={iconForLabel(sub.description)} size={38} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {sub.description ?? sub.category?.name ?? "Abonnement"}
        </Text>
        <Text style={[styles.meta, { color: late ? c.danger : c.textMuted }]}>
          {formatCurrency(Number(sub.amount), currency)} · {dueLabel(sub.next_occurrence)}
        </Text>
      </View>
      <Pressable
        onPress={() => run("skip")}
        disabled={!!busy}
        hitSlop={6}
        style={({ pressed }) => [styles.skip, { borderColor: c.border }, pressed && { opacity: 0.6 }]}
      >
        {busy === "skip" ? (
          <ActivityIndicator size="small" color={c.textMuted} />
        ) : (
          <Text style={[styles.skipText, { color: c.textMuted }]}>Ignorer</Text>
        )}
      </Pressable>
      <Pressable
        onPress={() => run("confirm")}
        disabled={!!busy}
        hitSlop={6}
        style={({ pressed }) => [styles.confirm, { backgroundColor: c.tint }, pressed && { opacity: 0.8 }]}
      >
        {busy === "confirm" ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="checkmark" size={18} color="#fff" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: Radius.md,
  },
  body: { flex: 1 },
  name: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  skip: {
    paddingHorizontal: 10,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 64,
    alignItems: "center",
  },
  skipText: { fontSize: 12, fontWeight: "600" },
  confirm: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
