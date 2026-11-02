import { Colors, Radius, Shadow } from "@/constants/theme";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { useBudgets } from "@/src/features/budgets/hooks/useBudgets";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { MonthlyLimitsCard } from "@/src/features/categories/components/MonthlyLimitsCard";
import { useMonthlySpending } from "@/src/features/categories/hooks/useMonthlySpending";
import { SubscriptionsCard } from "@/src/features/subscriptions/components/SubscriptionsCard";
import { useSubscriptions } from "@/src/features/subscriptions/hooks/useSubscriptions";
import type { Subscription } from "@/src/features/subscriptions/types/subscription.types";
import { resolveBudgetTheme } from "@/src/features/budgets/constants/budgetThemes";
import type { Budget } from "@/src/features/budgets/types/budget.types";
import { goalService } from "@/src/features/goals/services/goalService";
import { transactionService } from "@/src/features/transaction/services/transactionService";
import { getCurrencySymbol } from "@/src/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

// ─── Extended Budget type (aggregated fields from future joins) ───────────────
type BudgetWithStats = Budget & {
  initial_amount?: number;
  totalIncome?: number;
  totalExpense?: number;
};

// ─── Stats par budget (un seul budget = une seule entrée) ─────────────────────
type BudgetStats = {
  totalIncome: number;
  totalExpense: number;
  available_balance: number;
  goalsCount: number;
  transactionsCount: number;
};

// ─── Budget Card ──────────────────────────────────────────────────────────────
function BudgetCard({
  budget,
  onPress,
  isActive,
  stats,
  isDark,
}: {
  budget: BudgetWithStats;
  onPress: () => void;
  isActive: boolean;
  stats: BudgetStats | null;
  isDark: boolean;
}) {
  const c = isDark ? Colors.dark : Colors.light;
  const theme = resolveBudgetTheme(budget);

  const initialAmount = Number(budget.initial_amount ?? 0);
  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpense = stats?.totalExpense ?? 0;
  const goalsCount = stats?.goalsCount ?? 0;
  const balance = stats?.available_balance ?? 0;

  const totalAvailable = initialAmount + totalIncome;
  const pct =
    totalAvailable > 0
      ? Math.min((totalExpense / totalAvailable) * 100, 100)
      : 0;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const showInitial = initialAmount > 0 && totalIncome === 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.budgetCard,
          {
            backgroundColor: c.surface,
            borderColor: isActive ? c.tint : c.border,
            borderWidth: isActive ? 1.5 : 1,
          },
          Shadow.sm,
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardDot, { backgroundColor: theme.to }]} />
            <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>
              {budget.name}
            </Text>
          </View>
          <View style={[styles.cardBadge, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[styles.cardBadgeText, { color: c.textMuted }]}>
              {budget.currency}
            </Text>
          </View>
        </View>

        {/* Balance */}
        <Text style={[styles.cardBalanceLabel, { color: c.textSubtle }]}>
          Solde disponible
        </Text>
        <Text style={[styles.cardBalance, { color: c.text }]}>
          {fmt(balance)}
          <Text style={[styles.cardCurrency, { color: c.textMuted }]}>
            {" "}
            {getCurrencySymbol(budget.currency)}
          </Text>
        </Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: c.surfaceAlt }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pct}%` as any,
                  backgroundColor: pct > 80 ? c.danger : c.tint,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: c.textSubtle }]}>
            {Math.round(pct)}% dépensé
          </Text>
        </View>

        {/* Stats row */}
        <View style={[styles.cardStats, { backgroundColor: c.surfaceAlt }]}>
          {showInitial ? (
            <>
              <CardStat icon="banknote" label="Initial" value={fmt(initialAmount)} c={c} />
              <View style={[styles.cardStatDivider, { backgroundColor: c.border }]} />
              <CardStat icon="arrow.up.circle.fill" label="Dépenses" value={`-${fmt(totalExpense)}`} c={c} tone="danger" />
              <View style={[styles.cardStatDivider, { backgroundColor: c.border }]} />
              <CardStat icon="target" label="Objectifs" value={`${goalsCount}`} c={c} />
            </>
          ) : (
            <>
              <CardStat icon="arrow.down.circle.fill" label="Revenus" value={`+${fmt(initialAmount + totalIncome)}`} c={c} tone="accent" />
              <View style={[styles.cardStatDivider, { backgroundColor: c.border }]} />
              <CardStat icon="arrow.up.circle.fill" label="Dépenses" value={`-${fmt(totalExpense)}`} c={c} tone="danger" />
              <View style={[styles.cardStatDivider, { backgroundColor: c.border }]} />
              <CardStat icon="target" label="Objectifs" value={`${goalsCount}`} c={c} />
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function CardStat({
  icon,
  label,
  value,
  c,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  c: typeof Colors.light;
  tone?: "accent" | "danger";
}) {
  const color = tone === "accent" ? c.tint : tone === "danger" ? c.danger : c.textMuted;
  return (
    <View style={styles.cardStatItem}>
      <IconSymbol name={icon as any} size={13} color={color} />
      <Text style={[styles.cardStatValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.cardStatLabel, { color: c.textSubtle }]}>{label}</Text>
    </View>
  );
}

// ─── Quick Stat Pill ──────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
  tone,
  isDark,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: "accent" | "danger";
  isDark: boolean;
}) {
  const c = isDark ? Colors.dark : Colors.light;
  const color = tone === "accent" ? c.tint : tone === "danger" ? c.danger : c.textMuted;
  return (
    <Card padding={12} style={styles.statPill}>
      <View style={[styles.statPillIcon, { backgroundColor: c.surfaceAlt }]}>
        <IconSymbol name={icon as any} size={16} color={color} />
      </View>
      <View>
        <Text style={[styles.statPillValue, { color: c.text }]}>{value}</Text>
        <Text style={[styles.statPillLabel, { color: c.textSubtle }]}>{label}</Text>
      </View>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { top, bottom } = useSafeAreaInsets();

  const { budgets, isLoading, error, refresh } = useBudgets();
  const { activeBudget, balance, switchBudget } = useActiveBudget();
  const router = useRouter();
  const {
    data: monthly,
    isLoading: monthlyLoading,
    refresh: refreshMonthly,
  } = useMonthlySpending(activeBudget?.id);
  const {
    due: dueSubscriptions,
    active: activeSubscriptions,
    monthlyTotal: subscriptionsMonthlyTotal,
    refresh: refreshSubscriptions,
    confirm: confirmSubscription,
    skip: skipSubscription,
  } = useSubscriptions();

  // ── Cache des stats par budget : chaque carte lit UNIQUEMENT sa propre entrée ──
  const [budgetStatsMap, setBudgetStatsMap] = useState<
    Record<string, BudgetStats>
  >({});

  const loadStatsForAllBudgets = useCallback(async () => {
    if (budgets.length === 0) {
      setBudgetStatsMap({});
      return;
    }
    try {
      const results = await Promise.all(
        budgets.map(async (b) => {
          const [goalsCount, transactionsCount] = await Promise.all([
            goalService.countGoals(b.id).catch(() => 0),
            transactionService.countTransactions(b.id).catch(() => 0),
          ]);
          try {
            const s = await budgetService.getBudgetStats(b.id);
            return [b.id, { ...s, goalsCount, transactionsCount }] as const;
          } catch {
            const bal = await budgetService.getBalance(b.id);
            return [
              b.id,
              {
                totalIncome: 0,
                totalExpense: 0,
                available_balance: bal.available_balance,
                goalsCount,
                transactionsCount,
              },
            ] as const;
          }
        })
      );
      setBudgetStatsMap(Object.fromEntries(results));
    } catch {
      setBudgetStatsMap({});
    }
  }, [budgets]);

  useEffect(() => {
    loadStatsForAllBudgets();
  }, [loadStatsForAllBudgets]);

  useFocusEffect(
    useCallback(() => {
      if (budgets.length > 0) loadStatsForAllBudgets();
      refreshMonthly();
      refreshSubscriptions();
    }, [budgets.length, loadStatsForAllBudgets, refreshMonthly, refreshSubscriptions])
  );

  // Stats du budget actif (pour le hero + pills)
  const activeStats = activeBudget?.id
    ? budgetStatsMap[activeBudget.id]
    : null;

  const totalBalance = activeStats?.available_balance ?? balance?.available_balance ?? 0;
  const totalIncome = activeStats?.totalIncome ?? 0;
  const totalExpense = activeStats?.totalExpense ?? 0;
  const totalTx = activeStats?.transactionsCount ?? 0;

  // Objectifs : agrégés depuis les stats chargées pour chaque budget
  const totalGoals = budgets.reduce(
    (acc, b) => acc + (budgetStatsMap[b.id]?.goalsCount ?? 0),
    0,
  );

  // Une échéance validée devient une dépense : stats et plafonds à jour.
  const handleConfirmSubscription = async (sub: Subscription) => {
    await confirmSubscription(sub);
    await Promise.all([loadStatsForAllBudgets(), refreshMonthly()]);
  };

  const handleBudgetPress = (budget: Budget) => {
    switchBudget(budget);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: top + 16, paddingBottom: bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && budgets.length > 0}
            onRefresh={async () => {
              await refresh();
              await Promise.all([
                loadStatsForAllBudgets(),
                refreshMonthly(),
                refreshSubscriptions(),
              ]);
            }}
            tintColor={c.tint}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greet, { color: c.text }]}>Bonjour 👋</Text>
            <Text style={[styles.greetSub, { color: c.textMuted }]}>
              Voici vos finances
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[styles.headerBadgeText, { color: c.textMuted }]}>
              {budgets.length} budget{budgets.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* ── Balance hero (neutral) ── */}
        <Card style={styles.balanceCard} padding={20}>
          <Text style={[styles.balanceLabel, { color: c.textSubtle }]}>
            SOLDE DISPONIBLE
          </Text>
          {isLoading && budgets.length === 0 ? (
            <ActivityIndicator color={c.tint} style={{ marginTop: 8 }} />
          ) : (
            <Text style={[styles.balanceAmount, { color: c.text }]}>
              {fmt(totalBalance)}{" "}
              <Text style={{ color: c.textMuted, fontSize: 20, fontWeight: "700" }}>
                {getCurrencySymbol(activeBudget?.currency)}
              </Text>
            </Text>
          )}
        </Card>

        {/* Error */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: c.dangerMuted }]}>
            <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        )}

        {/* Stats pills */}
        <Text style={[styles.sectionTitle, { color: c.textSubtle }]}>
          VUE D'ENSEMBLE
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          <StatPill
            icon="arrow.down.circle.fill"
            label="Revenus totaux"
            value={`${fmt(totalIncome)} ${getCurrencySymbol(activeBudget?.currency)}`}
            tone="accent"
            isDark={isDark}
          />
          <StatPill
            icon="arrow.up.circle.fill"
            label="Dépenses totales"
            value={`${fmt(totalExpense)} ${getCurrencySymbol(activeBudget?.currency)}`}
            tone="danger"
            isDark={isDark}
          />
          <StatPill
            icon="list.bullet.rectangle"
            label="Transactions"
            value={`${totalTx}`}
            isDark={isDark}
          />
          <StatPill
            icon="target"
            label="Objectifs actifs"
            value={`${totalGoals}`}
            isDark={isDark}
          />
        </ScrollView>

        {/* Plafonds du mois (budget actif) */}
        {activeBudget && (
          <>
            <Text style={[styles.sectionTitle, { color: c.textSubtle, marginTop: 8 }]}>
              CE MOIS-CI
            </Text>
            <SubscriptionsCard
              due={dueSubscriptions}
              activeCount={activeSubscriptions.length}
              monthlyTotal={subscriptionsMonthlyTotal}
              currency={activeBudget.currency}
              onOpen={() =>
                router.push(
                  activeSubscriptions.length === 0
                    ? "/(modal)/add-subscription"
                    : "/(modal)/subscriptions",
                )
              }
              onConfirm={handleConfirmSubscription}
              onSkip={skipSubscription}
            />
            <MonthlyLimitsCard
              data={monthly}
              isLoading={monthlyLoading}
              currency={activeBudget.currency}
              onManage={() => router.push("/(modal)/monthly-limits")}
              onOpenSavings={() => router.push("/(tabs)/goals")}
              onAddExpense={(categoryId) =>
                router.push({
                  pathname: "/(modal)/add-transaction",
                  params: { type: "expense", category_id: categoryId, budget_id: activeBudget.id },
                })
              }
            />
          </>
        )}

        {/* Budget cards */}
        <Text style={[styles.sectionTitle, { color: c.textSubtle, marginTop: 8 }]}>
          MES BUDGETS
        </Text>

        {isLoading && budgets.length === 0 && (
          <Card style={styles.skeletonCard}>
            <ActivityIndicator color={c.tint} />
            <Text style={[styles.skeletonText, { color: c.textMuted }]}>
              Chargement des budgets...
            </Text>
          </Card>
        )}

        <View style={styles.cardsStack}>
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget as BudgetWithStats}
              onPress={() => handleBudgetPress(budget)}
              isActive={activeBudget?.id === budget.id}
              stats={budgetStatsMap[budget.id] ?? null}
              isDark={isDark}
            />
          ))}

          {!isLoading && budgets.length === 0 && (
            <EmptyState
              icon="file-tray-outline"
              title="Aucun budget"
              subtitle="Créez votre premier budget en appuyant sur +"
            />
          )}
        </View>
      </ScrollView>

      <FAB isDark={isDark} />
    </View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
function FAB({ isDark }: { isDark: boolean }) {
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={[
        styles.fabWrap,
        { bottom: bottom + 90, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push("/(modal)/add_budget")}
        style={[styles.fab, { backgroundColor: c.tint }]}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 12 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  greet: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  greetSub: { fontSize: 13, marginTop: 2 },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  headerBadgeText: { fontSize: 12, fontWeight: "600" },

  balanceCard: { marginBottom: 4 },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  pillsRow: { gap: 10, paddingRight: 16 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 160,
  },
  statPillIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statPillValue: { fontSize: 14, fontWeight: "700" },
  statPillLabel: { fontSize: 11, marginTop: 1 },

  cardsStack: { gap: 12 },
  budgetCard: {
    borderRadius: Radius.xl,
    padding: 18,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { fontSize: 15, fontWeight: "700", flex: 1 },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  cardBadgeText: { fontSize: 11, fontWeight: "700" },
  cardBalanceLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardBalance: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 14,
  },
  cardCurrency: { fontSize: 16, fontWeight: "600" },

  progressContainer: { marginBottom: 14, gap: 6 },
  progressBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11, fontWeight: "500" },

  cardStats: {
    flexDirection: "row",
    borderRadius: Radius.md,
    padding: 12,
  },
  cardStatItem: { flex: 1, alignItems: "center", gap: 3 },
  cardStatDivider: { width: 1, marginVertical: 2 },
  cardStatValue: { fontSize: 12, fontWeight: "700" },
  cardStatLabel: { fontSize: 10 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
  },
  errorText: { fontSize: 13, flex: 1 },

  skeletonCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
  },
  skeletonText: { fontSize: 13 },

  fabWrap: { position: "absolute", right: 20, alignItems: "center", gap: 6 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.md,
  },
});
