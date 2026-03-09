import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { useTransactions } from "@/src/features/transaction/hooks/useTransactions";
import { Transaction } from "@/src/features/transaction/types/transaction.types";
import { formatCurrency } from "@/src/utils/currency";
import { formatDate } from "@/src/utils/date";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Filter = "all" | "income" | "expense";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "Tout", value: "all" },
  { label: "Revenus", value: "income" },
  { label: "Dépenses", value: "expense" },
];

const CATEGORY_ICONS: Record<string, string> = {
  Salaire: "briefcase.fill",
  "Autre revenu": "plus.circle.fill",
  Loyer: "house.fill",
  Courses: "cart.fill",
  Transport: "car.fill",
  Abonnements: "bell.fill",
  Loisirs: "gamecontroller.fill",
  Restaurant: "fork.knife",
  Santé: "heart.fill",
  "Autre dépense": "ellipsis.circle.fill",
};

const CATEGORY_COLORS: Record<string, string> = {
  Salaire: "#10B981",
  "Autre revenu": "#34D399",
  Loyer: "#6366F1",
  Courses: "#F59E0B",
  Transport: "#3B82F6",
  Abonnements: "#8B5CF6",
  Loisirs: "#EC4899",
  Restaurant: "#F97316",
  Santé: "#06B6D4",
  "Autre dépense": "#6B7280",
};

const getCategoryIcon = (name?: string) =>
  (name && CATEGORY_ICONS[name]) ?? "creditcard.fill";

const getCategoryColor = (name?: string) =>
  (name && CATEGORY_COLORS[name]) ?? "#6B7280";

// ─── Header ────────────────────────────────────────────────────────────────────
function Header({
  transactions,
  top,
}: {
  transactions: Transaction[];
  top: number;
}) {
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [transactions]);

  return (
    <View style={[styles.header, { paddingTop: top + 16 }]}>
      {/* Top bar */}
      <View style={styles.headerTopBar}>
        <View>
          <Text style={styles.headerEyebrow}>VUE D'ENSEMBLE</Text>
          <Text style={styles.headerTitle}>Transactions</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerIconBtn}>
            <IconSymbol
              name="bell.fill"
              size={16}
              color="rgba(255,255,255,0.8)"
            />
          </Pressable>
        </View>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde actuel</Text>
        <Text style={styles.balanceAmount}>
          {totals.balance >= 0 ? "+" : ""}
          {formatCurrency(totals.balance)}
        </Text>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}>
            <View style={styles.balanceStatIcon}>
              <Feather name="arrow-up-circle" size={24} color="#10B981" />
            </View>
            <View>
              <Text style={styles.balanceStatLabel}>Revenus</Text>
              <Text style={[styles.balanceStatValue, { color: "#10B981" }]}>
                +{formatCurrency(totals.income)}
              </Text>
            </View>
          </View>

          <View style={styles.balanceStatSep} />

          <View style={styles.balanceStat}>
            <View style={[styles.balanceStatIcon, styles.balanceStatIconRed]}>
              <Feather name="arrow-down-circle" size={24} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.balanceStatLabel}>Dépenses</Text>
              <Text style={[styles.balanceStatValue, { color: "#EF4444" }]}>
                -{formatCurrency(totals.expense)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
function FilterTabs({
  active,
  onChange,
  isDark,
}: {
  active: Filter;
  onChange: (f: Filter) => void;
  isDark: boolean;
}) {
  return (
    <View style={[styles.filterWrap, isDark && styles.filterWrapDark]}>
      {FILTERS.map((f) => {
        const isActive = f.value === active;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            style={[
              styles.filterChip,
              isActive &&
                (isDark
                  ? styles.filterChipActiveDark
                  : styles.filterChipActive),
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive
                  ? isDark
                    ? styles.filterChipTextActiveDark
                    : styles.filterChipTextActive
                  : styles.filterChipTextInactive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function TransactionRow({
  item,
  isDark,
}: {
  item: Transaction;
  isDark: boolean;
}) {
  const isIncome = item.type === "income";
  const amountColor = isIncome ? "#10B981" : "#EF4444";
  const iconName = getCategoryIcon(item.category?.name);
  const iconColor = getCategoryColor(item.category?.name);
  const label = item.description ?? item.category?.name ?? "—";
  const sub =
    item.description && item.category?.name
      ? `${item.category.name} · ${formatDate(item.date)}`
      : formatDate(item.date);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isDark && styles.rowDark,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "15" }]}>
        <IconSymbol name={iconName as any} size={19} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowName, isDark && styles.textWhite]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={[styles.rowAmount, { color: amountColor }]}>
        {isIncome ? "+" : "−"}
        {formatCurrency(item.amount)}
      </Text>
    </Pressable>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ title, isDark }: { title: string; isDark: boolean }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text
        style={[styles.sectionLabelText, isDark && styles.sectionLabelDark]}
      >
        {title}
      </Text>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyBubble, isDark && styles.emptyBubbleDark]}>
        <IconSymbol
          name="tray.fill"
          size={26}
          color={isDark ? "#4B5563" : "#CBD5E1"}
        />
      </View>
      <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>
        Aucune transaction
      </Text>
      <Text style={styles.emptyHint}>
        Appuyez sur le bouton + pour{"\n"}ajouter votre première transaction.
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();

  const { transactions, isLoading, error, refresh } = useTransactions();
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const grouped = useMemo(() => {
    const filtered =
      filter === "all"
        ? transactions
        : transactions.filter((t) => t.type === filter);

    const map: Record<string, Transaction[]> = {};
    for (const t of filtered) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transactions, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <View style={[styles.screen, isDark && styles.screenDark]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            progressViewOffset={200}
          />
        }
      >
        {/* ── Header avec gradient sombre ── */}
        <Header transactions={transactions} top={top} />

        {/* ── Corps ── */}
        <View style={[styles.body, isDark && styles.bodyDark]}>
          {/* Filters */}
          <View style={styles.filtersSection}>
            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>
              Historique
            </Text>
            <FilterTabs active={filter} onChange={setFilter} isDark={isDark} />
          </View>

          {/* Content */}
          {isLoading && transactions.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#10B981" size="large" />
            </View>
          ) : grouped.length === 0 ? (
            <EmptyState isDark={isDark} />
          ) : (
            <View style={styles.listWrap}>
              {grouped.map(([date, items]) => (
                <View key={date}>
                  <SectionLabel
                    title={formatDate(date, { relative: true })}
                    isDark={isDark}
                  />
                  {items.map((item) => (
                    <TransactionRow key={item.id} item={item} isDark={isDark} />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBanner}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={14}
                color="#F59E0B"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Floating Action Button ── */}
      <Pressable
        onPress={() => router.push("/(modal)/add-transaction")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottom + 24 },
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={24} color="white" />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const HEADER_BG = "#0D4F3C";
const HEADER_BG2 = "#0A6B50";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  screenDark: {
    backgroundColor: "#0F172A",
  },

  // ── Header ──
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Balance card inside header
  balanceCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
    marginBottom: 16,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  balanceStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceStatIconRed: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  balanceStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
    marginBottom: 2,
  },
  balanceStatValue: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  balanceStatSep: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 12,
  },

  // ── Body ──
  body: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
  },
  bodyDark: {
    backgroundColor: "#0F172A",
  },

  // Filters section
  filtersSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  filterWrap: {
    flexDirection: "row",
    backgroundColor: "#EFF2F7",
    borderRadius: 14,
    padding: 4,
    gap: 3,
  },
  filterWrapDark: {
    backgroundColor: "#1E293B",
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipActiveDark: {
    backgroundColor: "#334155",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#0F172A",
  },
  filterChipTextActiveDark: {
    color: "#F8FAFC",
  },
  filterChipTextInactive: {
    color: "#94A3B8",
  },

  // ── List ──
  listWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabelWrap: {
    paddingVertical: 10,
    paddingTop: 16,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionLabelDark: {
    color: "#475569",
  },

  // Transaction row
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 14,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rowDark: {
    backgroundColor: "#1E293B",
    shadowOpacity: 0,
  },
  rowPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  rowSub: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "400",
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // ── Empty ──
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyBubble: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyBubbleDark: {
    backgroundColor: "#1E293B",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyHint: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Loading ──
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },

  // ── Error ──
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    margin: 20,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
  },

  // ── FAB ──
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.93 }],
    shadowOpacity: 0.2,
  },

  // ── Helpers ──
  textWhite: { color: "#F8FAFC" },
});
