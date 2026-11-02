import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { DueSubscriptionRow } from "@/src/features/subscriptions/components/DueSubscriptionRow";
import { useSubscriptions } from "@/src/features/subscriptions/hooks/useSubscriptions";
import type { Subscription } from "@/src/features/subscriptions/types/subscription.types";
import {
  FREQUENCY_LABELS,
  daysUntil,
} from "@/src/features/subscriptions/utils/schedule";
import { formatCurrency } from "@/src/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const nextLabel = (iso: string) => {
  const d = daysUntil(iso);
  if (d <= 0) return "À valider";
  if (d === 1) return "Demain";
  if (d < 7) return `Dans ${d} jours`;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
};

function SubscriptionRow({
  sub,
  currency,
  onPress,
  c,
}: {
  sub: Subscription;
  currency: string;
  onPress: () => void;
  c: typeof Colors.light;
}) {
  const color = sub.category?.color ?? "#8B5CF6";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }, !sub.is_active && { opacity: 0.5 }]}
    >
      <View style={[styles.icon, { backgroundColor: color + "20" }]}>
        <Text style={styles.emoji}>{sub.category?.icon ?? "📱"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {sub.description ?? sub.category?.name}
        </Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {sub.is_active ? nextLabel(sub.next_occurrence) : "En pause"}
        </Text>
      </View>
      <Text style={[styles.amount, { color: c.text }]}>
        {formatCurrency(Number(sub.amount), currency)}
        <Text style={[styles.freq, { color: c.textSubtle }]}> / {FREQUENCY_LABELS[sub.frequency]}</Text>
      </Text>
    </Pressable>
  );
}

export default function SubscriptionsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { activeBudget } = useBudgetStore();
  const { subscriptions, due, active, monthlyTotal, isLoading, refresh, confirm, skip } =
    useSubscriptions();
  const currency = activeBudget?.currency ?? "EUR";

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const paused = subscriptions.filter((s) => !s.is_active);
  const openEdit = (sub: Subscription) =>
    router.push({ pathname: "/(modal)/add-subscription", params: { id: sub.id } });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={c.tint} />}
      >
        {/* Total */}
        <Card padding={18}>
          <Text style={[styles.totalLabel, { color: c.textSubtle }]}>TOTAL PAR MOIS</Text>
          <Text style={[styles.totalValue, { color: c.text }]}>
            {formatCurrency(Math.round(monthlyTotal), currency)}
          </Text>
          <Text style={[styles.totalMeta, { color: c.textMuted }]}>
            {active.length} abonnement{active.length !== 1 ? "s" : ""} actif{active.length !== 1 ? "s" : ""} ·
            soit {formatCurrency(Math.round(monthlyTotal * 12), currency)} par an
          </Text>
        </Card>

        {isLoading && subscriptions.length === 0 && <ActivityIndicator color={c.tint} />}

        {/* À valider */}
        {due.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSubtle }]}>À VALIDER</Text>
            {due.map((sub) => (
              <DueSubscriptionRow key={sub.id} sub={sub} currency={currency} onConfirm={confirm} onSkip={skip} />
            ))}
          </View>
        )}

        {/* Liste */}
        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSubtle }]}>PROCHAINS PRÉLÈVEMENTS</Text>
            <Card padding={4}>
              {active.map((sub, i) => (
                <View
                  key={sub.id}
                  style={i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}
                >
                  <SubscriptionRow sub={sub} currency={currency} onPress={() => openEdit(sub)} c={c} />
                </View>
              ))}
            </Card>
          </View>
        )}

        {paused.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSubtle }]}>EN PAUSE</Text>
            <Card padding={4}>
              {paused.map((sub) => (
                <SubscriptionRow key={sub.id} sub={sub} currency={currency} onPress={() => openEdit(sub)} c={c} />
              ))}
            </Card>
          </View>
        )}

        {!isLoading && subscriptions.length === 0 && (
          <EmptyState
            icon="repeat-outline"
            title="Aucun abonnement"
            subtitle="Ajoutez vos dépenses qui reviennent chaque mois : on vous rappellera de les valider le jour J."
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + 12, backgroundColor: c.bg }]}>
        <Button
          label="Ajouter un abonnement"
          icon={<Ionicons name="add" size={18} color="#fff" />}
          onPress={() => router.push("/(modal)/add-subscription")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  totalLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  totalValue: { fontSize: 30, fontWeight: "800", letterSpacing: -1, marginTop: 4 },
  totalMeta: { fontSize: 12, marginTop: 4 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 18 },
  name: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: "700" },
  freq: { fontSize: 11, fontWeight: "500" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8 },
});
