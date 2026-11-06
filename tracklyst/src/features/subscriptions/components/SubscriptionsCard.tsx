import { Colors, Radius } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { formatCurrency } from "@/src/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import type { Subscription } from "../types/subscription.types";
import { DueSubscriptionRow } from "./DueSubscriptionRow";

/**
 * Carte d'accueil : échéances à valider en haut, puis résumé cliquable
 * (total mensuel, nombre d'abonnements) qui ouvre la liste complète.
 */
export function SubscriptionsCard({
  due,
  activeCount,
  monthlyTotal,
  currency,
  onOpen,
  onConfirm,
  onSkip,
}: {
  due: Subscription[];
  activeCount: number;
  monthlyTotal: number;
  currency: string;
  onOpen: () => void;
  onConfirm: (sub: Subscription) => Promise<void>;
  onSkip: (sub: Subscription) => Promise<void>;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <Card padding={14} style={styles.card}>
      {due.length > 0 && (
        <View style={styles.due}>
          <View style={styles.dueHeader}>
            <Ionicons name="notifications" size={14} color={c.warning} />
            <Text style={[styles.dueTitle, { color: c.text }]}>
              {due.length === 1 ? "1 prélèvement à valider" : `${due.length} prélèvements à valider`}
            </Text>
          </View>
          {due.map((sub) => (
            <DueSubscriptionRow
              key={sub.id}
              sub={sub}
              currency={currency}
              onConfirm={onConfirm}
              onSkip={onSkip}
            />
          ))}
        </View>
      )}

      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.summary, pressed && { opacity: 0.6 }]}
      >
        <CategoryIcon icon="autorenew" color="#8B5CF6" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.summaryTitle, { color: c.text }]}>Paiements réguliers</Text>
          <Text style={[styles.summaryMeta, { color: c.textMuted }]}>
            {activeCount === 0
              ? "Ajoutez cotisation familiale, loyer, internet…"
              : `${activeCount} actif${activeCount > 1 ? "s" : ""} · ${formatCurrency(Math.round(monthlyTotal), currency)} / mois`}
          </Text>
        </View>
        <Ionicons
          name={activeCount === 0 ? "add-circle" : "chevron-forward"}
          size={activeCount === 0 ? 22 : 18}
          color={activeCount === 0 ? c.tint : c.textSubtle}
        />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  due: { gap: 8 },
  dueHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  dueTitle: { fontSize: 13, fontWeight: "700" },
  summary: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryTitle: { fontSize: 14, fontWeight: "700" },
  summaryMeta: { fontSize: 12, marginTop: 2 },
});
