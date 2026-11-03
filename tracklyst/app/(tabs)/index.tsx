import { Colors, Radius, Shadow } from "@/constants/theme";
import { StatusBarScrim } from "@/src/components/ui/StatusBarScrim";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { useBudgets } from "@/src/features/budgets/hooks/useBudgets";
import { BudgetSwitcherSheet } from "@/src/features/budgets/components/BudgetSwitcherSheet";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { CashflowChart } from "@/src/features/dashboard/components/CashflowChart";
import { CategoryBreakdown } from "@/src/features/dashboard/components/CategoryBreakdown";
import { MonthKpis } from "@/src/features/dashboard/components/MonthKpis";
import { QuickActionsSheet, type QuickAction } from "@/src/features/dashboard/components/QuickActionsSheet";
import { useDashboardStats } from "@/src/features/dashboard/hooks/useDashboardStats";
import { MonthlyLimitsCard } from "@/src/features/categories/components/MonthlyLimitsCard";
import { useMonthlySpending } from "@/src/features/categories/hooks/useMonthlySpending";
import { SubscriptionsCard } from "@/src/features/subscriptions/components/SubscriptionsCard";
import { useSubscriptions } from "@/src/features/subscriptions/hooks/useSubscriptions";
import type { Subscription } from "@/src/features/subscriptions/types/subscription.types";
import { resolveBudgetTheme } from "@/src/features/budgets/constants/budgetThemes";
import { useGoals } from "@/src/features/goals/hooks/useGoals";
import { useReminderSync } from "@/src/features/notifications/hooks/useReminderSync";
import { PrivacyToggle } from "@/src/features/privacy/components/PrivacyToggle";
import { usePrivacyStore } from "@/src/features/privacy/store/privacyStore";
import { goalService } from "@/src/features/goals/services/goalService";
import { transactionService } from "@/src/features/transaction/services/transactionService";
import { getCurrencySymbol } from "@/src/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

// ─── Stats par budget (un seul budget = une seule entrée) ─────────────────────
type BudgetStats = {
  totalIncome: number;
  totalExpense: number;
  available_balance: number;
  goalsCount: number;
  transactionsCount: number;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { top, bottom } = useSafeAreaInsets();

  const { budgets, isLoading, error, refresh } = useBudgets();
  const { activeBudget, balance, switchBudget } = useActiveBudget();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const openQuickAction = (action: QuickAction) => {
    switch (action) {
      case "expense":
      case "income":
        router.push({
          pathname: "/(modal)/add-transaction",
          params: { type: action, ...(activeBudget ? { budget_id: activeBudget.id } : {}) },
        });
        break;
      case "budget":
        router.push("/(modal)/add_budget");
        break;
      case "goal":
        router.push("/(modal)/add-goal" as any);
        break;
      case "subscription":
        router.push("/(modal)/add-subscription" as any);
        break;
    }
  };
  const { hidden, toggle: toggleHidden } = usePrivacyStore();
  const router = useRouter();
  const {
    data: monthly,
    isLoading: monthlyLoading,
    refresh: refreshMonthly,
  } = useMonthlySpending(activeBudget?.id);
  const { data: dashboard, refresh: refreshDashboard } = useDashboardStats(
    activeBudget?.id,
  );
  const {
    due: dueSubscriptions,
    active: activeSubscriptions,
    monthlyTotal: subscriptionsMonthlyTotal,
    refresh: refreshSubscriptions,
    confirm: confirmSubscription,
    skip: skipSubscription,
  } = useSubscriptions();

  const { goals } = useGoals();
  useReminderSync({
    budget: activeBudget,
    subscriptions: activeSubscriptions,
    goals,
    monthly,
  });

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
      refreshDashboard();
    }, [budgets.length, loadStatsForAllBudgets, refreshMonthly, refreshSubscriptions, refreshDashboard])
  );

  // Stats du budget actif (pour le hero + pills)
  const activeStats = activeBudget?.id
    ? budgetStatsMap[activeBudget.id]
    : null;

  const totalBalance = activeStats?.available_balance ?? balance?.available_balance ?? 0;


  // Une échéance validée devient une dépense : stats et plafonds à jour.
  const handleConfirmSubscription = async (sub: Subscription) => {
    await confirmSubscription(sub);
    await Promise.all([loadStatsForAllBudgets(), refreshMonthly(), refreshDashboard()]);
  };


  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
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
                refreshDashboard(),
              ]);
            }}
            tintColor={c.tint}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greet, { color: c.text }]}>Bonjour</Text>
            <Text style={[styles.greetSub, { color: c.textMuted }]}>
              Voici vos finances
            </Text>
          </View>
        </View>

        {/* ── Solde du budget actif ── */}
        {activeBudget && (
          <Card style={styles.balanceCard} padding={18}>
            <View style={styles.balanceTop}>
              <Pressable
                onPress={() => setSwitcherOpen(true)}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.budgetPill,
                  { backgroundColor: c.surfaceAlt },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.budgetDot, { backgroundColor: resolveBudgetTheme(activeBudget).to }]} />
                <Text style={[styles.budgetPillText, { color: c.text }]} numberOfLines={1}>
                  {activeBudget.name}
                </Text>
                <Ionicons name="chevron-down" size={16} color={c.textMuted} />
              </Pressable>
              <PrivacyToggle />
            </View>

            <Text style={[styles.balanceLabel, { color: c.textSubtle }]}>
              SOLDE DISPONIBLE
            </Text>
            {isLoading && budgets.length === 0 ? (
              <ActivityIndicator color={c.tint} style={{ marginTop: 8, alignSelf: "flex-start" }} />
            ) : (
              <Pressable onPress={toggleHidden} hitSlop={6}>
                <Text style={[styles.balanceAmount, { color: c.text }]}>
                  {hidden ? "•••••••" : fmt(totalBalance)}{" "}
                  <Text style={{ color: c.textMuted, fontSize: 20, fontWeight: "700" }}>
                    {getCurrencySymbol(activeBudget.currency)}
                  </Text>
                </Text>
              </Pressable>
            )}
            {budgets.length > 1 && (
              <Text style={[styles.balanceHint, { color: c.textSubtle }]}>
                {budgets.length} budgets · touchez le nom pour changer
              </Text>
            )}
          </Card>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: c.dangerMuted }]}>
            <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        )}

        {/* Indicateurs du mois */}
        {dashboard && activeBudget && (
          <MonthKpis
            current={dashboard.current}
            previous={dashboard.previous}
            currency={activeBudget.currency}
          />
        )}

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

        {/* Analyse */}
        {dashboard && activeBudget && (
          <>
            <Text style={[styles.sectionTitle, { color: c.textSubtle, marginTop: 8 }]}>
              ANALYSE
            </Text>
            <CashflowChart months={dashboard.months} currency={activeBudget.currency} />
            <CategoryBreakdown
              categories={dashboard.byCategory}
              total={dashboard.current.expense}
              monthLabel={dashboard.current.longLabel}
              currency={activeBudget.currency}
            />
          </>
        )}

        {isLoading && budgets.length === 0 && (
          <Card style={styles.skeletonCard}>
            <ActivityIndicator color={c.tint} />
            <Text style={[styles.skeletonText, { color: c.textMuted }]}>
              Chargement des budgets...
            </Text>
          </Card>
        )}

        {!isLoading && budgets.length === 0 && (
          <EmptyState
            icon="wallet-outline"
            title="Aucun budget"
            subtitle="Créez votre premier budget pour commencer à suivre vos finances."
            actionLabel="Créer un budget"
            onAction={() => router.push("/(modal)/add_budget")}
          />
        )}
      </ScrollView>
      <StatusBarScrim />

      <BudgetSwitcherSheet
        visible={switcherOpen}
        budgets={budgets}
        activeId={activeBudget?.id}
        balances={Object.fromEntries(
          Object.entries(budgetStatsMap).map(([id, st]) => [id, st.available_balance]),
        )}
        onSelect={(b) => {
          switchBudget(b);
          setSwitcherOpen(false);
        }}
        onCreate={() => {
          setSwitcherOpen(false);
          router.push("/(modal)/add_budget");
        }}
        onJoin={() => {
          setSwitcherOpen(false);
          router.push("/(modal)/join-budget" as any);
        }}
        onEdit={(b) => {
          setSwitcherOpen(false);
          router.push({ pathname: "/(modal)/add_budget", params: { id: b.id } });
        }}
        onClose={() => setSwitcherOpen(false)}
      />

      <QuickActionsSheet
        visible={quickOpen}
        onPick={openQuickAction}
        onClose={() => setQuickOpen(false)}
      />

      <FAB isDark={isDark} open={quickOpen} onPress={() => setQuickOpen((o) => !o)} />
    </View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
function FAB({ isDark, open, onPress }: { isDark: boolean; open: boolean; onPress: () => void }) {
  const c = isDark ? Colors.dark : Colors.light;
  const { bottom } = useSafeAreaInsets();
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(turn, { toValue: open ? 1 : 0, useNativeDriver: true }).start();
  }, [open, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

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
        onPress={onPress}
        accessibilityLabel="Ajouter"
        style={[styles.fab, { backgroundColor: c.tint }]}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="add" size={26} color="#fff" />
        </Animated.View>
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

  balanceCard: { marginBottom: 4 },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  budgetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    flexShrink: 1,
  },
  budgetDot: { width: 10, height: 10, borderRadius: 5 },
  budgetPillText: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  balanceHint: { fontSize: 12, marginTop: 8 },
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
