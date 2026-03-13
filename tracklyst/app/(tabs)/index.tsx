import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { useBudgets } from "@/src/features/budgets/hooks/useBudgets";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import type { Budget } from "@/src/features/budgets/types/budget.types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
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

const { width } = Dimensions.get("window");

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = {
  light: {
    bg: "#F0F4F8",
    card: "#FFFFFF",
    text: "#0D1B2A",
    sub: "#5C7080",
    border: "#E2EAF0",
  },
  dark: {
    bg: "#0A0F1E",
    card: "#131929",
    text: "#E8EFF8",
    sub: "#7A92AA",
    border: "#1E2D40",
  },
};

const BUDGET_GRADIENTS = [
  { from: "#0D4F3C", to: "#10B981", accent: "#34D399" },
  { from: "#1E1B4B", to: "#6366F1", accent: "#A5B4FC" },
  { from: "#7C2D12", to: "#F97316", accent: "#FED7AA" },
  { from: "#164E63", to: "#0EA5E9", accent: "#BAE6FD" },
  { from: "#4C0519", to: "#F43F5E", accent: "#FECDD3" },
  { from: "#2E1065", to: "#8B5CF6", accent: "#DDD6FE" },
];

// ─── Extended Budget type (aggregated fields from future joins) ───────────────
type BudgetWithStats = Budget & {
  initial_amount?: number;
  totalIncome?: number;
  totalExpense?: number;
  goalsCount?: number;
  transactionsCount?: number;
};

// ─── Stats par budget (un seul budget = une seule entrée) ─────────────────────
type BudgetStats = {
  totalIncome: number;
  totalExpense: number;
  available_balance: number;
};

// ─── Budget Card ──────────────────────────────────────────────────────────────
function BudgetCard({
  budget,
  index,
  onPress,
  isActive,
  stats,
}: {
  budget: BudgetWithStats;
  index: number;
  onPress: () => void;
  isActive: boolean;
  stats: BudgetStats | null;
}) {
  const g = BUDGET_GRADIENTS[index % BUDGET_GRADIENTS.length];

  const initialAmount = Number(budget.initial_amount ?? 0);
  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpense = stats?.totalExpense ?? 0;
  const goalsCount = budget.goalsCount ?? 0;

  // ✅ Chaque carte affiche UNIQUEMENT son propre solde (jamais celui d'un autre budget)
  const balance = stats?.available_balance ?? 0;

  // Barre de progression : dépenses / (initial + revenus)
  const totalAvailable = initialAmount + totalIncome;
  const pct =
    totalAvailable > 0
      ? Math.min((totalExpense / totalAvailable) * 100, 100)
      : 0;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.budgetCard, { backgroundColor: g.from }]}
      >
        <View
          style={[
            styles.cardCircle,
            { backgroundColor: g.to + "30", right: -30, top: -40 },
          ]}
        />
        <View
          style={[
            styles.cardCircleSmall,
            { backgroundColor: g.to + "20", right: 40, bottom: -20 },
          ]}
        />

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardDot, { backgroundColor: g.accent }]} />
            <Text style={styles.cardName} numberOfLines={1}>
              {budget.name}
            </Text>
          </View>
          <View style={[styles.cardBadge, { backgroundColor: g.to + "40" }]}>
            <Text style={[styles.cardBadgeText, { color: g.accent }]}>
              {budget.currency}
            </Text>
          </View>
        </View>

        {/* Balance */}
        <Text style={styles.cardBalanceLabel}>Solde disponible</Text>
        <Text style={styles.cardBalance}>
          {fmt(balance)}
          <Text style={styles.cardCurrency}> Ar</Text>
        </Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pct}%` as any,
                  backgroundColor: pct > 80 ? "#F87171" : g.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>{Math.round(pct)}% dépensé</Text>
        </View>

        {/* Stats row — affiche initial_amount si pas de revenus, sinon revenus */}
        <View style={styles.cardStats}>
          {initialAmount > 0 && totalIncome === 0 ? (
            // Budget neuf : montre le montant initial
            <>
              <CardStat
                icon="banknote"
                label="Initial"
                value={`${fmt(initialAmount)}`}
                color={g.accent}
              />
              <View style={styles.cardStatDivider} />
              <CardStat
                icon="arrow.up.circle.fill"
                label="Dépenses"
                value={`-${fmt(totalExpense)}`}
                color="#F87171"
              />
              <View style={styles.cardStatDivider} />
              <CardStat
                icon="target"
                label="Objectifs"
                value={`${goalsCount}`}
                color={g.accent}
              />
            </>
          ) : (
            // Budget avec transactions : montre revenus + dépenses
            <>
              <CardStat
                icon="arrow.down.circle.fill"
                label="Revenus"
                value={`+${fmt(initialAmount + totalIncome)}`}
                color="#34D399"
              />
              <View style={styles.cardStatDivider} />
              <CardStat
                icon="arrow.up.circle.fill"
                label="Dépenses"
                value={`-${fmt(totalExpense)}`}
                color="#F87171"
              />
              <View style={styles.cardStatDivider} />
              <CardStat
                icon="target"
                label="Objectifs"
                value={`${goalsCount}`}
                color={g.accent}
              />
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
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.cardStatItem}>
      <IconSymbol name={icon as any} size={13} color={color} />
      <Text style={styles.cardStatValue}>{value}</Text>
      <Text style={styles.cardStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Quick Stat Pill ──────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  isDark: boolean;
}) {
  const p = isDark ? PALETTE.dark : PALETTE.light;
  return (
    <View
      style={[
        styles.statPill,
        { backgroundColor: p.card, borderColor: p.border },
      ]}
    >
      <View style={[styles.statPillIcon, { backgroundColor: color + "18" }]}>
        <IconSymbol name={icon as any} size={16} color={color} />
      </View>
      <View>
        <Text style={[styles.statPillValue, { color: p.text }]}>{value}</Text>
        <Text style={[styles.statPillLabel, { color: p.sub }]}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const { top, bottom } = useSafeAreaInsets();
  const p = isDark ? PALETTE.dark : PALETTE.light;
  const scrollY = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const { budgets, isLoading, error, refresh } = useBudgets();
  const { activeBudget, balance, switchBudget } = useActiveBudget();

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
          try {
            const s = await budgetService.getBudgetStats(b.id);
            return [b.id, s] as const;
          } catch {
            const bal = await budgetService.getBalance(b.id);
            return [
              b.id,
              {
                totalIncome: 0,
                totalExpense: 0,
                available_balance: bal.available_balance,
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
    }, [budgets.length, loadStatsForAllBudgets])
  );

  // Stats du budget actif (pour le hero + pills)
  const activeStats = activeBudget?.id
    ? budgetStatsMap[activeBudget.id]
    : null;

  const totalBalance = activeStats?.available_balance ?? balance?.available_balance ?? 0;
  const totalIncome = activeStats?.totalIncome ?? 0;
  const totalExpense = activeStats?.totalExpense ?? 0;
  const totalTx = 0; // non utilisé par budget, on garde 0 ou on pourrait sommer

  // Objectifs : on garde le compteur issu des budgets (agrégé par budget)
  const totalGoals = budgets.reduce(
    (acc, b) => acc + ((b as BudgetWithStats).goalsCount ?? 0),
    0,
  );

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [180, 80],
    extrapolate: "clamp",
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const handleBudgetPress = (budget: Budget) => {
    switchBudget(budget);
  };

  return (
    <View style={[styles.root, { backgroundColor: p.bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* ── Hero ── */}
      <Animated.View
        style={[
          styles.hero,
          {
            paddingTop: top + 12,
            height: Animated.add(headerHeight, top + 12),
          },
        ]}
      >
        <View style={styles.heroBlob1} />
        <View style={styles.heroBlob2} />

        <View style={styles.heroContent}>
          <Animated.View style={{ opacity: headerOpacity }}>
            <Text style={styles.heroGreet}>Bonjour 👋</Text>
            <Text style={styles.heroSub}>Voici vos finances</Text>
          </Animated.View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {budgets.length} budget{budgets.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.heroBalance}>
          <Text style={styles.heroBalanceLabel}>Solde disponible</Text>
          {isLoading && budgets.length === 0 ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 6 }} />
          ) : (
            <Text style={styles.heroBalanceAmount}>{fmt(totalBalance)} Ar</Text>
          )}
        </View>
      </Animated.View>

      {/* ── Scroll ── */}
      <Animated.ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && budgets.length > 0}
            onRefresh={async () => {
              await refresh();
              await loadStatsForAllBudgets();
            }}
            tintColor={isDark ? "#34D399" : "#10B981"}
          />
        }
      >
        {/* Error */}
        {error && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats pills */}
        <Text style={[styles.sectionTitle, { color: p.sub }]}>
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
            value={`${fmt(totalIncome)} Ar`}
            color="#10B981"
            isDark={isDark}
          />
          <StatPill
            icon="arrow.up.circle.fill"
            label="Dépenses totales"
            value={`${fmt(totalExpense)} Ar`}
            color="#EF4444"
            isDark={isDark}
          />
          <StatPill
            icon="list.bullet.rectangle"
            label="Transactions"
            value={`${totalTx}`}
            color="#6366F1"
            isDark={isDark}
          />
          <StatPill
            icon="target"
            label="Objectifs actifs"
            value={`${totalGoals}`}
            color="#F59E0B"
            isDark={isDark}
          />
        </ScrollView>

        {/* Budget cards */}
        <Text style={[styles.sectionTitle, { color: p.sub, marginTop: 8 }]}>
          MES BUDGETS
        </Text>

        {isLoading && budgets.length === 0 && (
          <View
            style={[
              styles.skeletonCard,
              { backgroundColor: p.card, borderColor: p.border },
            ]}
          >
            <ActivityIndicator color="#10B981" />
            <Text style={[styles.skeletonText, { color: p.sub }]}>
              Chargement des budgets...
            </Text>
          </View>
        )}

        <View style={styles.cardsStack}>
          {budgets.map((budget, i) => (
            <BudgetCard
              key={budget.id}
              budget={budget as BudgetWithStats}
              index={i}
              onPress={() => handleBudgetPress(budget)}
              isActive={activeBudget?.id === budget.id}
              stats={budgetStatsMap[budget.id] ?? null}
            />
          ))}

          {!isLoading && budgets.length === 0 && (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: p.card, borderColor: p.border },
              ]}
            >
              <IconSymbol name="tray.fill" size={36} color={p.sub} />
              <Text style={[styles.emptyTitle, { color: p.text }]}>
                Aucun budget
              </Text>
              <Text style={[styles.emptySub, { color: p.sub }]}>
                Créez votre premier budget en appuyant sur +
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <FAB isDark={isDark} />
    </View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
function FAB({ isDark }: { isDark: boolean }) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const onPressIn = () =>
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

  const onPressOut = () =>
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

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
        style={styles.fab}
      >
        <Animated.View style={[styles.fabInner, { transform: [{ rotate }] }]}>
          <Ionicons name="add" size={24} color="white" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    backgroundColor: "#0D4F3C",
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  heroBlob1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#10B981",
    opacity: 0.15,
    top: -60,
    right: -60,
  },
  heroBlob2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#34D399",
    opacity: 0.1,
    bottom: -20,
    left: width * 0.3,
  },
  heroContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroGreet: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  heroBalance: { marginTop: 12 },
  heroBalanceLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroBalanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
    marginTop: 2,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 160,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  statPillIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statPillValue: { fontSize: 14, fontWeight: "700" },
  statPillLabel: { fontSize: 11, marginTop: 1 },

  cardsStack: { gap: 14 },
  budgetCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  cardCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  cardCircleSmall: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#fff", flex: 1 },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  cardBadgeText: { fontSize: 11, fontWeight: "700" },
  cardBalanceLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardBalance: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1.5,
    marginTop: 4,
    marginBottom: 16,
  },
  cardCurrency: { fontSize: 18, fontWeight: "600" },

  progressContainer: { marginBottom: 16, gap: 6 },
  progressBg: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },

  cardStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    padding: 12,
  },
  cardStatItem: { flex: 1, alignItems: "center", gap: 3 },
  cardStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 2,
  },
  cardStatValue: { fontSize: 12, fontWeight: "700", color: "#fff" },
  cardStatLabel: { fontSize: 10, color: "rgba(255,255,255,0.5)" },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  errorText: { fontSize: 13, color: "#EF4444", flex: 1 },

  skeletonCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  skeletonText: { fontSize: 13 },

  emptyCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },

  fabWrap: { position: "absolute", right: 20, alignItems: "center", gap: 6 },
  fab: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  fabInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0D4F3C",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ android: { elevation: 10 } }),
  },
});
