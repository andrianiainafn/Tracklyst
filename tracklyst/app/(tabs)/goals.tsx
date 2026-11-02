import { Colors, Radius, Shadow } from "@/constants/theme";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { useGoals } from "@/src/features/goals/hooks/useGoals";
import { formatCurrency } from "@/src/utils/currency";
import { formatDate } from "@/src/utils/date";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GoalsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();

  const { activeBudget, balance } = useActiveBudget();
  const { goals, isLoading, error } = useGoals();

  const totals = useMemo(() => {
    let locked = 0;
    let target = 0;
    let completed = 0;
    for (const g of goals) {
      locked += g.current_amount;
      target += g.target_amount;
      if (g.status === "completed") completed += 1;
    }
    const progressPct = target > 0 ? Math.min((locked / target) * 100, 100) : 0;
    return { locked, target, completed, progressPct };
  }, [goals]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: top, paddingBottom: bottom + 12, backgroundColor: c.bg },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScreenHeader
        icon="flag-outline"
        title="Objectifs"
        subtitle="Épargnez pour vos projets importants"
      />

      {/* Overview */}
      <View style={styles.overviewRow}>
        <Card style={styles.overviewCard} padding={12}>
          <Text style={[styles.overviewLabel, { color: c.textSubtle }]}>
            Montant bloqué
          </Text>
          <Text style={[styles.overviewValue, { color: c.text }]}>
            {formatCurrency(totals.locked, activeBudget?.currency)}
          </Text>
          <Text style={[styles.overviewHint, { color: c.textMuted }]}>
            Sur {formatCurrency(totals.target, activeBudget?.currency)}
          </Text>
        </Card>
        <Card style={styles.overviewCard} padding={12}>
          <Text style={[styles.overviewLabel, { color: c.textSubtle }]}>
            Objectifs
          </Text>
          <Text style={[styles.overviewValue, { color: c.text }]}>
            {goals.length}
          </Text>
          <Text style={[styles.overviewHint, { color: c.textMuted }]}>
            {totals.completed} terminés
          </Text>
        </Card>
      </View>

      {/* Balance info */}
      {activeBudget && (
        <View style={[styles.balanceChip, { backgroundColor: c.tintMuted }]}>
          <IconSymbol name="wallet.pass.fill" size={14} color={c.tint} />
          <Text style={[styles.balanceChipText, { color: isDark ? c.tint : "#047857" }]}>
            Budget actif :{" "}
            <Text style={{ fontWeight: "700" }}>{activeBudget.name}</Text> ·{" "}
            {formatCurrency(balance?.available_balance ?? 0, activeBudget?.currency)}{" "}
            dispo
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && goals.length === 0 && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={c.tint} />
          </View>
        )}

        {error && (
          <View style={[styles.errorBox, { backgroundColor: c.dangerMuted }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.danger} />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        )}

        {!isLoading && goals.length === 0 && !error && (
          <EmptyState
            icon="flag-outline"
            title="Aucun objectif"
            subtitle="Créez un objectif pour mettre de côté une partie de votre budget."
            actionLabel="Créer un objectif"
            onAction={() => router.push("/(modal)/add-goal")}
          />
        )}

        {goals.map((g) => {
          const ratio =
            g.target_amount > 0
              ? Math.min(g.current_amount / g.target_amount, 1)
              : 0;
          const pct = Math.round(ratio * 100);
          const color = g.color ?? c.tint;
          const deadlineLabel = g.deadline
            ? formatDate(g.deadline, { relative: true })
            : "Sans échéance";

          return (
            <Pressable
              key={g.id}
              onPress={() =>
                router.push({
                  pathname: "/(modal)/goal-transfer",
                  params: { goalId: g.id },
                } as any)
              }
              style={({ pressed }) => [
                styles.goalCard,
                { backgroundColor: c.surface, borderColor: c.border },
                pressed && styles.goalCardPressed,
              ]}
            >
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: color + "22" as any }]}>
                  <IconSymbol name="target" size={18} color={color} />
                </View>
                <View style={styles.goalTitleWrap}>
                  <Text style={[styles.goalTitle, { color: c.text }]} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={[styles.goalSubtitle, { color: c.textSubtle }]}>
                    {deadlineLabel}
                  </Text>
                </View>
                <Text style={[styles.goalStatus, { color: c.textMuted }]}>{pct}%</Text>
              </View>

              <View style={styles.goalProgressBar}>
                <View style={[styles.goalProgressTrack, { backgroundColor: c.surfaceAlt }]}>
                  <View
                    style={[
                      styles.goalProgressFill,
                      { width: `${pct}%` as any, backgroundColor: color },
                    ]}
                  />
                </View>
                <View style={styles.goalAmountsRow}>
                  <Text style={[styles.goalAmount, { color: c.text }]}>
                    {formatCurrency(g.current_amount, activeBudget?.currency)}
                  </Text>
                  <Text style={[styles.goalTarget, { color: c.textMuted }]}>
                    sur {formatCurrency(g.target_amount, activeBudget?.currency)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/(modal)/add-goal")}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.tint, bottom: bottom + 24 },
          pressed && styles.fabPressed,
        ]}
      >
        <IconSymbol name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },

  overviewRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  overviewCard: { flex: 1 },
  overviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  overviewValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  overviewHint: { fontSize: 12, marginTop: 2 },

  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    marginBottom: 8,
  },
  balanceChipText: { fontSize: 12 },

  list: { flex: 1 },
  loadingWrap: { paddingVertical: 24, alignItems: "center" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
  },
  errorText: { fontSize: 12, flex: 1 },

  goalCard: {
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  goalCardPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalIcon: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  goalTitleWrap: { flex: 1 },
  goalTitle: { fontSize: 14, fontWeight: "700" },
  goalSubtitle: { fontSize: 11, marginTop: 2 },
  goalStatus: { fontSize: 13, fontWeight: "700" },

  goalProgressBar: { marginTop: 10, gap: 6 },
  goalProgressTrack: { height: 6, borderRadius: Radius.pill, overflow: "hidden" },
  goalProgressFill: { height: "100%", borderRadius: Radius.pill },
  goalAmountsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalAmount: { fontSize: 13, fontWeight: "700" },
  goalTarget: { fontSize: 12 },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.md,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
});
