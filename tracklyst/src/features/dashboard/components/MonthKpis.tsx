import { Colors, Radius } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { formatCurrencyCompact } from "@/src/utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import type { MonthFlow } from "../hooks/useDashboardStats";

function Kpi({
  label,
  value,
  previous,
  previousLabel,
  swatch,
  upIsGood,
  currency,
  c,
}: {
  label: string;
  value: number;
  previous: number;
  previousLabel: string;
  swatch: string;
  upIsGood: boolean;
  currency: string;
  c: typeof Colors.light;
}) {
  const hasPrevious = previous > 0;
  const delta = hasPrevious ? (value - previous) / previous : 0;
  const up = delta >= 0;
  const good = up === upIsGood;
  const pct = Math.round(Math.abs(delta) * 100);

  return (
    <Card padding={14} style={styles.kpi}>
      <View style={styles.labelRow}>
        <View style={[styles.swatch, { backgroundColor: swatch }]} />
        <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrencyCompact(value, currency)}
      </Text>
      <View style={styles.deltaRow}>
        {hasPrevious ? (
          <>
            <View
              style={[
                styles.deltaBadge,
                { backgroundColor: good ? c.tintMuted : c.dangerMuted },
              ]}
            >
              <MaterialCommunityIcons
                name={up ? "trending-up" : "trending-down"}
                size={13}
                color={good ? c.tint : c.danger}
              />
              <Text style={[styles.deltaPct, { color: good ? c.tint : c.danger }]}>
                {pct} %
              </Text>
            </View>
            <Text style={[styles.deltaText, { color: c.textSubtle }]} numberOfLines={1}>
              vs {previousLabel}
            </Text>
          </>
        ) : (
          <Text style={[styles.deltaText, { color: c.textSubtle }]}>
            Rien en {previousLabel}
          </Text>
        )}
      </View>
    </Card>
  );
}

/** Revenus et dépenses du mois, avec l'évolution par rapport au mois précédent. */
export function MonthKpis({
  current,
  previous,
  currency,
}: {
  current: MonthFlow;
  previous: MonthFlow;
  currency: string;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.row}>
      <Kpi
        label="Revenus du mois"
        value={current.income}
        previous={previous.income}
        previousLabel={previous.label}
        swatch={c.chartIncome}
        upIsGood
        currency={currency}
        c={c}
      />
      <Kpi
        label="Dépenses du mois"
        value={current.expense}
        previous={previous.expense}
        previousLabel={previous.label}
        swatch={c.chartExpense}
        upIsGood={false}
        currency={currency}
        c={c}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: "600" },
  value: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  deltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  deltaPct: { fontSize: 11, fontWeight: "700" },
  deltaText: { fontSize: 11, flexShrink: 1 },
});
