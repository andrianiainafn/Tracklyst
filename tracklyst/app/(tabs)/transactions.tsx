import { Colors, Radius, Shadow } from "@/constants/theme";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useNotifications } from "@/src/features/notifications/hooks/useNotifications";
import { useDeleteTransaction } from "@/src/features/transaction/hooks/useDeleteTransaction";
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
  Alert,
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

// ─── Header ────────────────────────────────────────────────────────────────────
function Header({
  transactions,
  top,
  currency,
  notificationsCount,
  onBellPress,
  isDark,
}: {
  transactions: Transaction[];
  top: number;
  currency?: string;
  notificationsCount: number;
  onBellPress: () => void;
  isDark: boolean;
}) {
  const c = isDark ? Colors.dark : Colors.light;
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
          <Text style={[styles.headerEyebrow, { color: c.textSubtle }]}>
            VUE D'ENSEMBLE
          </Text>
          <Text style={[styles.headerTitle, { color: c.text }]}>Transactions</Text>
        </View>
        <Pressable
          style={[styles.headerIconBtn, { backgroundColor: c.surfaceAlt }]}
          onPress={onBellPress}
        >
          <IconSymbol name="bell.fill" size={16} color={c.textMuted} />
          {notificationsCount > 0 && (
            <View style={[styles.headerIconBadge, { borderColor: c.bg }]}>
              <Text style={styles.headerIconBadgeText}>
                {notificationsCount > 9 ? "9+" : notificationsCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Balance card */}
      <Card style={styles.balanceCard} padding={20}>
        <Text style={[styles.balanceLabel, { color: c.textSubtle }]}>Solde actuel</Text>
        <Text style={[styles.balanceAmount, { color: c.text }]}>
          {totals.balance >= 0 ? "+" : ""}
          {formatCurrency(totals.balance, currency)}
        </Text>

        <View style={[styles.balanceDivider, { backgroundColor: c.border }]} />

        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}>
            <View style={[styles.balanceStatIcon, { backgroundColor: c.tintMuted }]}>
              <Feather name="arrow-up-circle" size={22} color={c.tint} />
            </View>
            <View>
              <Text style={[styles.balanceStatLabel, { color: c.textSubtle }]}>Revenus</Text>
              <Text style={[styles.balanceStatValue, { color: c.tint }]}>
                +{formatCurrency(totals.income, currency)}
              </Text>
            </View>
          </View>

          <View style={[styles.balanceStatSep, { backgroundColor: c.border }]} />

          <View style={styles.balanceStat}>
            <View style={[styles.balanceStatIcon, { backgroundColor: c.dangerMuted }]}>
              <Feather name="arrow-down-circle" size={22} color={c.danger} />
            </View>
            <View>
              <Text style={[styles.balanceStatLabel, { color: c.textSubtle }]}>Dépenses</Text>
              <Text style={[styles.balanceStatValue, { color: c.danger }]}>
                -{formatCurrency(totals.expense, currency)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
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
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.filterWrap, { backgroundColor: c.surfaceAlt }]}>
      {FILTERS.map((f) => {
        const isActive = f.value === active;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            style={[
              styles.filterChip,
              isActive && { backgroundColor: c.surface, ...Shadow.sm },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: isActive ? c.text : c.textSubtle },
                isActive && { fontWeight: "700" },
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
  currency,
  onPress,
}: {
  item: Transaction;
  isDark: boolean;
  currency?: string;
  onPress: () => void;
}) {
  const c = isDark ? Colors.dark : Colors.light;
  const isIncome = item.type === "income";
  const amountColor = isIncome ? c.tint : c.danger;
  const categoryIcon = item.category?.icon ?? "💳";
  const categoryColor = item.category?.color ?? "#6B7280";
  const label = item.description ?? item.category?.name ?? "—";
  const sub =
    item.description && item.category?.name
      ? `${item.category.name} · ${formatDate(item.date)}`
      : formatDate(item.date);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: categoryColor + "15" }]}>
        <Text style={styles.rowIconEmoji}>{categoryIcon}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: c.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.rowSub, { color: c.textSubtle }]}>{sub}</Text>
      </View>
      <Text style={[styles.rowAmount, { color: amountColor }]}>
        {isIncome ? "+" : "−"}
        {formatCurrency(item.amount, currency)}
      </Text>
    </Pressable>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ title, isDark }: { title: string; isDark: boolean }) {
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={[styles.sectionLabelText, { color: c.textSubtle }]}>{title}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();

  const { transactions, isLoading, error, refresh } = useTransactions();
  const { activeBudget } = useBudgetStore();
  const { notifications } = useNotifications();
  const { deleteTransaction } = useDeleteTransaction();
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert(
        "Supprimer la transaction",
        "Cette action est irréversible.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteTransaction(id);
              } catch (err) {
                Alert.alert(
                  "Erreur",
                  err instanceof Error
                    ? err.message
                    : "Impossible de supprimer la transaction.",
                );
              }
            },
          },
        ],
      );
    },
    [deleteTransaction],
  );

  const handleTransactionPress = useCallback(
    (item: Transaction) => {
      Alert.alert(item.description ?? item.category?.name ?? "Transaction", undefined, [
        {
          text: "Modifier",
          onPress: () =>
            router.push({
              pathname: "/(modal)/add-transaction",
              params: {
                id: item.id,
                type: item.type,
                amount: String(item.amount),
                category_id: item.category_id,
                description: item.description ?? "",
                date: item.date,
                budget_id: item.budget_id,
              },
            } as any),
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => confirmDelete(item.id),
        },
        { text: "Annuler", style: "cancel" },
      ]);
    },
    [router, confirmDelete],
  );

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
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.tint} />
        }
      >
        <Header
          transactions={transactions}
          top={top}
          currency={activeBudget?.currency}
          notificationsCount={notifications.length}
          onBellPress={() => router.push("/(modal)/notifications" as any)}
          isDark={isDark}
        />

        <View style={styles.body}>
          {/* Filters */}
          <View style={styles.filtersSection}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Historique</Text>
            <FilterTabs active={filter} onChange={setFilter} isDark={isDark} />
          </View>

          {/* Content */}
          {isLoading && transactions.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={c.tint} size="large" />
            </View>
          ) : grouped.length === 0 ? (
            <EmptyState
              icon="file-tray-outline"
              title="Aucune transaction"
              subtitle={"Appuyez sur le bouton + pour\najouter votre première transaction."}
            />
          ) : (
            <View style={styles.listWrap}>
              {grouped.map(([date, items]) => (
                <View key={date}>
                  <SectionLabel title={formatDate(date, { relative: true })} isDark={isDark} />
                  {items.map((item) => (
                    <TransactionRow
                      key={item.id}
                      item={item}
                      isDark={isDark}
                      currency={activeBudget?.currency}
                      onPress={() => handleTransactionPress(item)}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: c.dangerMuted }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.danger} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Floating Action Button ── */}
      <Pressable
        onPress={() => router.push("/(modal)/add-transaction")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottom + 24, backgroundColor: c.tint },
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 4 },
  headerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerEyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 2,
  },
  headerIconBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  headerIconBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  balanceCard: { marginBottom: 8 },
  balanceLabel: { fontSize: 12, fontWeight: "500", marginBottom: 6, letterSpacing: 0.3 },
  balanceAmount: { fontSize: 30, fontWeight: "800", letterSpacing: -1, marginBottom: 16 },
  balanceDivider: { height: 1, marginBottom: 16 },
  balanceStats: { flexDirection: "row", alignItems: "center" },
  balanceStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  balanceStatIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceStatLabel: { fontSize: 11, fontWeight: "500", marginBottom: 2 },
  balanceStatValue: { fontSize: 14, fontWeight: "700", letterSpacing: -0.3 },
  balanceStatSep: { width: 1, height: 32, marginHorizontal: 12 },

  body: { flex: 1 },
  filtersSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14, letterSpacing: -0.3 },
  filterWrap: { flexDirection: "row", borderRadius: Radius.md, padding: 4, gap: 3 },
  filterChip: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: "center" },
  filterChipText: { fontSize: 13, fontWeight: "600" },

  listWrap: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabelWrap: { paddingVertical: 10, paddingTop: 16 },
  sectionLabelText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 14,
    ...Shadow.sm,
  },
  rowPressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  rowIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  rowIconEmoji: { fontSize: 20 },
  rowBody: { flex: 1, gap: 3 },
  rowName: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, fontWeight: "400" },
  rowAmount: { fontSize: 15, fontWeight: "700", letterSpacing: -0.4 },

  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: Radius.md,
    padding: 14,
    margin: 20,
    marginTop: 8,
  },
  errorText: { fontSize: 12, flex: 1 },

  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.md,
  },
  fabPressed: { transform: [{ scale: 0.93 }] },
});
