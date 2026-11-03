import { Colors, Radius } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { formatCurrency } from "@/src/utils/currency";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import type {
  CategorySpending,
  LimitStatus,
  MonthlySpending,
} from "../hooks/useMonthlySpending";
import { CategoryIcon } from "./CategoryIcon";

const money = (n: number, currency: string) =>
  formatCurrency(Math.round(n), currency);

const monthLabel = () => {
  const label = new Date().toLocaleDateString("fr-FR", { month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const daysLeftInMonth = () => {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate();
};

function statusColor(status: LimitStatus, c: typeof Colors.light) {
  return status === "over" ? c.danger : status === "warning" ? c.warning : c.tint;
}

// ─── Barre de progression ─────────────────────────────────────────────────────
function Bar({ ratio, color, c }: { ratio: number; color: string; c: typeof Colors.light }) {
  return (
    <View style={[styles.barBg, { backgroundColor: c.surfaceAlt }]}>
      <View
        style={[
          styles.barFill,
          { width: `${Math.min(ratio, 1) * 100}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
}

// ─── Ligne catégorie ──────────────────────────────────────────────────────────
function LimitRow({
  item,
  currency,
  onPress,
  c,
}: {
  item: CategorySpending;
  currency: string;
  onPress: () => void;
  c: typeof Colors.light;
}) {
  const color = statusColor(item.status, c);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <CategoryIcon category={item.category} size={40} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, { color: c.text }]} numberOfLines={1}>
            {item.category.name}
          </Text>
          <Text style={[styles.rowAmount, { color: c.text }]}>
            {money(item.spent, currency)}
            <Text style={{ color: c.textSubtle, fontWeight: "500" }}>
              {" / "}
              {money(item.limit, currency)}
            </Text>
          </Text>
        </View>
        <Bar ratio={item.ratio} color={color} c={c} />
        <Text style={[styles.rowHint, { color: item.status === "ok" ? c.textSubtle : color }]}>
          {item.status === "over"
            ? `Dépassé de ${money(-item.remaining, currency)}`
            : `Reste ${money(item.remaining, currency)}`}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Carte « Ce mois-ci » ─────────────────────────────────────────────────────
export function MonthlyLimitsCard({
  data,
  isLoading,
  currency,
  onManage,
  onAddExpense,
  onOpenSavings,
}: {
  data: MonthlySpending | null;
  isLoading: boolean;
  currency: string;
  onManage: () => void;
  onAddExpense: (categoryId: string) => void;
  onOpenSavings: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const hasLimits = !!data && data.limited.length > 0;
  const totalRatio = hasLimits ? data.totalLimitedSpent / data.totalLimit : 0;
  const totalStatus: LimitStatus =
    totalRatio > 1 ? "over" : totalRatio >= 0.8 ? "warning" : "ok";
  const daysLeft = daysLeftInMonth();

  return (
    <Card padding={16} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>{monthLabel()}</Text>
          <Text style={[styles.subtitle, { color: c.textSubtle }]}>
            {daysLeft === 0 ? "Dernier jour du mois" : `Encore ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
          </Text>
        </View>
        <Pressable
          onPress={onManage}
          hitSlop={8}
          style={({ pressed }) => [
            styles.manageBtn,
            { backgroundColor: c.tintMuted },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="options-outline" size={14} color={c.tint} />
          <Text style={[styles.manageText, { color: c.tint }]}>Plafonds</Text>
        </Pressable>
      </View>

      {isLoading && !data ? (
        <ActivityIndicator color={c.tint} style={{ marginVertical: 16 }} />
      ) : !hasLimits ? (
        <Pressable
          onPress={onManage}
          style={({ pressed }) => [
            styles.empty,
            { backgroundColor: c.surfaceAlt },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.emptyIcons}>
            {(["gas-station-outline", "autorenew", "receipt-text-outline"] as const).map((name) => (
              <View key={name} style={[styles.emptyIcon, { backgroundColor: c.surface }]}>
                <MaterialCommunityIcons name={name} size={20} color={c.tint} />
              </View>
            ))}
          </View>
          <Text style={[styles.emptyTitle, { color: c.text }]}>
            Fixez vos plafonds du mois
          </Text>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Essence, abonnements, petites dépenses… voyez d'un coup d'œil ce
            qu'il vous reste.
          </Text>
        </Pressable>
      ) : (
        <>
          {/* Total */}
          <View style={[styles.total, { backgroundColor: c.surfaceAlt }]}>
            <View style={styles.rowTop}>
              <Text style={[styles.totalLabel, { color: c.textMuted }]}>
                Total plafonné
              </Text>
              <Text style={[styles.totalValue, { color: c.text }]}>
                {money(data.totalLimitedSpent, currency)}
                <Text style={{ color: c.textSubtle, fontWeight: "500" }}>
                  {" / "}
                  {money(data.totalLimit, currency)}
                </Text>
              </Text>
            </View>
            <Bar ratio={totalRatio} color={statusColor(totalStatus, c)} c={c} />
          </View>

          <View style={styles.rows}>
            {data.limited.map((item) => (
              <LimitRow
                key={item.category.id}
                item={item}
                currency={currency}
                onPress={() => onAddExpense(item.category.id)}
                c={c}
              />
            ))}
          </View>

          {data.unlimitedSpent > 0 && (
            <Text style={[styles.footer, { color: c.textSubtle }]}>
              + {money(data.unlimitedSpent, currency)} dépensés hors
              plafonds ce mois-ci
            </Text>
          )}
        </>
      )}

      {/* Épargne du mois */}
      {data && (
        <Pressable
          onPress={onOpenSavings}
          style={({ pressed }) => [
            styles.savings,
            { borderTopColor: c.border },
            pressed && { opacity: 0.6 },
          ]}
        >
          <CategoryIcon icon="piggy-bank-outline" color={c.tint} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowName, { color: c.text }]}>Épargné ce mois-ci</Text>
            {data.saved <= 0 && (
              <Text style={[styles.rowHint, { color: c.textSubtle, marginTop: 2 }]}>
                Mettez de côté vers un objectif
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.savingsValue,
              { color: data.saved > 0 ? c.tint : data.saved < 0 ? c.danger : c.textMuted },
            ]}
          >
            {data.saved > 0 ? "+" : ""}
            {money(data.saved, currency)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2 },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  manageText: { fontSize: 12, fontWeight: "700" },

  empty: {
    borderRadius: Radius.md,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  emptyIcons: { flexDirection: "row", gap: 8, marginBottom: 4 },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 14, fontWeight: "700" },
  emptyText: { fontSize: 12, textAlign: "center", lineHeight: 17 },

  total: { borderRadius: Radius.md, padding: 12, gap: 8 },
  totalLabel: { fontSize: 12, fontWeight: "600" },
  totalValue: { fontSize: 14, fontWeight: "800" },

  rows: { gap: 14 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  rowBody: { flex: 1, gap: 6 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rowName: { fontSize: 14, fontWeight: "700", flex: 1 },
  rowAmount: { fontSize: 13, fontWeight: "700" },
  rowHint: { fontSize: 11, fontWeight: "600" },

  barBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  footer: { fontSize: 11, textAlign: "center" },

  savings: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  savingsValue: { fontSize: 15, fontWeight: "800" },
});
