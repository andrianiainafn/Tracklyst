import { Colors, Radius, Shadow } from "@/constants/theme";
import { StatusBarScrim } from "@/src/components/ui/StatusBarScrim";
import { IconSymbol } from "@/src/components/ui/icon-symbol";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import { useNotifications } from "@/src/features/notifications/hooks/useNotifications";
import { useDeleteTransaction } from "@/src/features/transaction/hooks/useDeleteTransaction";
import { useTransactions } from "@/src/features/transaction/hooks/useTransactions";
import { Transaction } from "@/src/features/transaction/types/transaction.types";
import { formatCurrency } from "@/src/utils/currency";
import { formatDate } from "@/src/utils/date";
import { getErrorMessage } from "@/src/utils/errors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Filter = "all" | "income" | "expense";
type Palette = typeof Colors.light;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "Tout", value: "all" },
  { label: "Revenus", value: "income" },
  { label: "Dépenses", value: "expense" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const monthKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Month navigator ──────────────────────────────────────────────────────────
function MonthNavigator({
  month,
  onPrev,
  onNext,
  canNext,
  c,
}: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
  c: Palette;
}) {
  const label = capitalize(
    month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  );
  return (
    <View style={styles.monthNav}>
      <Pressable
        onPress={onPrev}
        hitSlop={10}
        style={({ pressed }) => [styles.monthBtn, { backgroundColor: c.surfaceAlt }, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={18} color={c.text} />
      </Pressable>
      <Text style={[styles.monthLabel, { color: c.text }]}>{label}</Text>
      <Pressable
        onPress={onNext}
        disabled={!canNext}
        hitSlop={10}
        style={({ pressed }) => [
          styles.monthBtn,
          { backgroundColor: c.surfaceAlt, opacity: canNext ? 1 : 0.35 },
          pressed && canNext && { opacity: 0.6 },
        ]}
      >
        <Ionicons name="chevron-forward" size={18} color={c.text} />
      </Pressable>
    </View>
  );
}

// ─── Month summary ────────────────────────────────────────────────────────────
function MonthSummary({
  income,
  expense,
  currency,
  c,
}: {
  income: number;
  expense: number;
  currency?: string;
  c: Palette;
}) {
  const net = income - expense;
  const ratio = income > 0 ? expense / income : 0;
  const meterColor = ratio > 1 ? c.danger : ratio >= 0.8 ? c.warning : c.tint;

  return (
    <Card padding={18} style={styles.summary}>
      <View style={styles.summaryRow}>
        <SummaryStat label="Revenus" value={income} swatch={c.chartIncome} currency={currency} c={c} />
        <View style={[styles.summarySep, { backgroundColor: c.border }]} />
        <SummaryStat label="Dépenses" value={expense} swatch={c.chartExpense} currency={currency} c={c} />
        <View style={[styles.summarySep, { backgroundColor: c.border }]} />
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Solde</Text>
          <Text style={[styles.summaryValue, { color: net < 0 ? c.danger : c.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {net > 0 ? "+" : ""}
            {formatCurrency(Math.round(net), currency)}
          </Text>
        </View>
      </View>

      {income > 0 && (
        <View style={styles.meter}>
          <View style={[styles.meterTrack, { backgroundColor: c.surfaceAlt }]}>
            <View
              style={[
                styles.meterFill,
                { width: `${Math.min(ratio, 1) * 100}%` as any, backgroundColor: meterColor },
              ]}
            />
          </View>
          <Text style={[styles.meterText, { color: c.textMuted }]}>
            {ratio > 1
              ? `Dépenses supérieures aux revenus de ${Math.round((ratio - 1) * 100)} %`
              : `${Math.round(ratio * 100)} % des revenus dépensés`}
          </Text>
        </View>
      )}
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  swatch,
  currency,
  c,
}: {
  label: string;
  value: number;
  swatch: string;
  currency?: string;
  c: Palette;
}) {
  return (
    <View style={styles.summaryStat}>
      <View style={styles.summaryLabelRow}>
        <View style={[styles.swatch, { backgroundColor: swatch }]} />
        <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.summaryValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(Math.round(value), currency)}
      </Text>
    </View>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
function FilterTabs({
  active,
  onChange,
  c,
}: {
  active: Filter;
  onChange: (f: Filter) => void;
  c: Palette;
}) {
  return (
    <View style={[styles.filterWrap, { backgroundColor: c.surfaceAlt }]}>
      {FILTERS.map((f) => {
        const isActive = f.value === active;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            style={[styles.filterChip, isActive && { backgroundColor: c.surface, ...Shadow.sm }]}
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
  currency,
  onPress,
  c,
}: {
  item: Transaction;
  currency?: string;
  onPress: () => void;
  c: Palette;
}) {
  const isIncome = item.type === "income";
  const label = item.description || item.category?.name || "Transaction";
  const sub = item.description && item.category?.name ? item.category.name : formatDate(item.date, { short: true });

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}>
      <CategoryIcon category={{ ...item.category, type: item.type }} size={40} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: c.text }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.rowSubLine}>
          <Text style={[styles.rowSub, { color: c.textSubtle }]} numberOfLines={1}>
            {sub}
          </Text>
          {item.is_recurring && (
            <MaterialCommunityIcons name="autorenew" size={12} color={c.textSubtle} />
          )}
        </View>
      </View>
      <Text style={[styles.rowAmount, { color: isIncome ? c.tint : c.text }]}>
        {isIncome ? "+" : "−"}
        {formatCurrency(Number(item.amount), currency)}
      </Text>
    </Pressable>
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
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const currency = activeBudget?.currency;
  const currentMonthKey = monthKeyOf(new Date());
  const selectedKey = monthKeyOf(month);
  const canNext = selectedKey < currentMonthKey;
  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert("Supprimer la transaction", "Cette action est irréversible.", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(id);
            } catch (err) {
              Alert.alert("Erreur", getErrorMessage(err, "Impossible de supprimer la transaction."));
            }
          },
        },
      ]);
    },
    [deleteTransaction],
  );

  const handleTransactionPress = useCallback(
    (item: Transaction) => {
      Alert.alert(item.description || item.category?.name || "Transaction", undefined, [
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
        { text: "Supprimer", style: "destructive", onPress: () => confirmDelete(item.id) },
        { text: "Annuler", style: "cancel" },
      ]);
    },
    [router, confirmDelete],
  );

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedKey)),
    [transactions, selectedKey],
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTransactions) {
      if (t.type === "income") income += Number(t.amount);
      else expense += Number(t.amount);
    }
    return { income, expense };
  }, [monthTransactions]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = monthTransactions.filter(
      (t) =>
        (filter === "all" || t.type === filter) &&
        (!q ||
          t.description?.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q)),
    );

    const map: Record<string, Transaction[]> = {};
    for (const t of filtered) (map[t.date] ??= []).push(t);
    return Object.entries(map)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items,
        net: items.reduce((acc, t) => acc + (t.type === "income" ? 1 : -1) * Number(t.amount), 0),
      }));
  }, [monthTransactions, filter, query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const monthName = month.toLocaleDateString("fr-FR", { month: "long" });

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.tint} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: c.text }]}>Transactions</Text>
            <Text style={[styles.subtitle, { color: c.textMuted }]}>
              {monthTransactions.length} opération{monthTransactions.length !== 1 ? "s" : ""} en {monthName}
            </Text>
          </View>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}
            onPress={() => router.push("/(modal)/notifications" as any)}
          >
            <IconSymbol name="bell.fill" size={16} color={c.textMuted} />
            {notifications.length > 0 && (
              <View style={[styles.badge, { borderColor: c.bg, backgroundColor: c.danger }]}>
                <Text style={styles.badgeText}>{notifications.length > 9 ? "9+" : notifications.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <MonthNavigator month={month} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} canNext={canNext} c={c} />

        <MonthSummary income={totals.income} expense={totals.expense} currency={currency} c={c} />

        {/* Search + filters */}
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="search" size={16} color={c.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une opération ou une catégorie"
            placeholderTextColor={c.textSubtle}
            style={[styles.searchInput, { color: c.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.textSubtle} />
            </Pressable>
          )}
        </View>
        <FilterTabs active={filter} onChange={setFilter} c={c} />

        {/* List */}
        {isLoading && transactions.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.tint} size="large" />
          </View>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={query ? "search-outline" : "receipt-outline"}
            title={query ? "Aucun résultat" : `Aucune transaction en ${monthName}`}
            subtitle={query ? "Essayez un autre mot-clé." : "Appuyez sur + pour ajouter une opération."}
          />
        ) : (
          grouped.map(({ date, items, net }) => (
            <View key={date} style={styles.day}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: c.textMuted }]}>
                  {capitalize(formatDate(date, { relative: true }))}
                </Text>
                <Text style={[styles.dayNet, { color: c.textSubtle }]}>
                  {net > 0 ? "+" : net < 0 ? "−" : ""}
                  {formatCurrency(Math.abs(Math.round(net)), currency)}
                </Text>
              </View>
              <Card padding={0} style={styles.dayCard}>
                {items.map((item, i) => (
                  <React.Fragment key={item.id}>
                    {i > 0 && <View style={[styles.separator, { backgroundColor: c.border }]} />}
                    <TransactionRow
                      item={item}
                      currency={currency}
                      onPress={() => handleTransactionPress(item)}
                      c={c}
                    />
                  </React.Fragment>
                ))}
              </Card>
            </View>
          ))
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: c.dangerMuted }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.danger} />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        )}
      </ScrollView>
      <StatusBarScrim />

      <Pressable
        onPress={() => router.push("/(modal)/add-transaction")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottom + 90, backgroundColor: c.tint },
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 16, fontWeight: "700" },

  summary: { gap: 14 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryStat: { flex: 1, gap: 4 },
  summaryLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  summaryLabel: { fontSize: 12, fontWeight: "600" },
  summaryValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  summarySep: { width: 1, height: 34, marginHorizontal: 10 },
  meter: { gap: 6 },
  meterTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  meterFill: { height: "100%", borderRadius: 3 },
  meterText: { fontSize: 12 },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 },
  filterWrap: { flexDirection: "row", borderRadius: Radius.md, padding: 4, gap: 3 },
  filterChip: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: "center" },
  filterChipText: { fontSize: 13, fontWeight: "600" },

  day: { gap: 8 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  dayLabel: { fontSize: 13, fontWeight: "700" },
  dayNet: { fontSize: 12, fontWeight: "600" },
  dayCard: { overflow: "hidden" },
  // Aligné sur le texte, après l'icône (14 + 40 + 12).
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 66 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: 14, fontWeight: "600" },
  rowSubLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowSub: { fontSize: 12, flexShrink: 1 },
  rowAmount: { fontSize: 14, fontWeight: "700", letterSpacing: -0.3 },

  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: Radius.md, padding: 14 },
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
