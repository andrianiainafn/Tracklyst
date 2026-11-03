import { Colors } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { formatCurrency, formatCurrencyCompact } from "@/src/utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View, useColorScheme } from "react-native";
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import type { MonthFlow } from "../hooks/useDashboardStats";

const HEIGHT = 168;
const AXIS_W = 40; // libellés de l'axe Y
const LABEL_H = 22; // libellés des mois
const TOP = 8;
const BAR_MAX_W = 14;
const BAR_GAP = 2; // espace entre les deux colonnes d'un mois
const RADIUS = 4;

/** Colonne arrondie en haut seulement, posée sur la ligne de base. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/** Arrondit le maximum de l'axe à une valeur lisible (1, 2, 2.5, 5 × 10^n). */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function LegendItem({ color, label, c }: { color: string; label: string; c: typeof Colors.light }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

/**
 * Revenus vs dépenses sur 6 mois. Toucher un mois affiche son détail
 * (montants exacts + solde) au-dessus du graphique.
 */
export function CashflowChart({ months, currency }: { months: MonthFlow[]; currency: string }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(months.length - 1);

  useEffect(() => setSelected(months.length - 1), [months.length]);

  const month = months[selected] ?? months[months.length - 1];
  const net = month.income - month.expense;
  const max = niceMax(Math.max(...months.map((m) => Math.max(m.income, m.expense))));
  const empty = months.every((m) => m.income === 0 && m.expense === 0);

  const plotW = Math.max(0, width - AXIS_W);
  const plotH = HEIGHT - LABEL_H - TOP;
  const groupW = plotW / months.length;
  const barW = Math.min(BAR_MAX_W, (groupW * 0.6 - BAR_GAP) / 2);
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];

  return (
    <Card padding={16} style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Évolution sur 6 mois</Text>
        <View style={styles.legend}>
          <LegendItem color={c.chartIncome} label="Revenus" c={c} />
          <LegendItem color={c.chartExpense} label="Dépenses" c={c} />
        </View>
      </View>

      {empty ? (
        <View style={[styles.empty, { backgroundColor: c.surfaceAlt }]}>
          <MaterialCommunityIcons name="chart-bar" size={28} color={c.textSubtle} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>Pas encore de données</Text>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Vos revenus et dépenses des 6 derniers mois apparaîtront ici.
          </Text>
        </View>
      ) : (
        <>
      {/* Détail du mois sélectionné */}
      <View style={[styles.detail, { backgroundColor: c.surfaceAlt }]}>
        <Text style={[styles.detailMonth, { color: c.textMuted }]}>
          {month.longLabel.charAt(0).toUpperCase() + month.longLabel.slice(1)}
        </Text>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <View style={[styles.legendSwatch, { backgroundColor: c.chartIncome }]} />
            <Text style={[styles.detailValue, { color: c.text }]}>{formatCurrency(Math.round(month.income), currency)}</Text>
          </View>
          <View style={styles.detailItem}>
            <View style={[styles.legendSwatch, { backgroundColor: c.chartExpense }]} />
            <Text style={[styles.detailValue, { color: c.text }]}>{formatCurrency(Math.round(month.expense), currency)}</Text>
          </View>
        </View>
        <Text style={[styles.detailNet, { color: c.textMuted }]}>
          Solde du mois{" "}
          <Text style={{ color: c.text, fontWeight: "800" }}>
            {net > 0 ? "+" : ""}
            {formatCurrency(Math.round(net), currency)}
          </Text>
        </Text>
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {/* Grille + axe Y (discrets) */}
            {ticks.map((t) => (
              <G key={t}>
                <Line
                  x1={AXIS_W}
                  x2={width}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={c.border}
                  strokeWidth={1}
                  strokeDasharray={t === 0 ? undefined : "3 4"}
                />
                <SvgText x={AXIS_W - 6} y={y(t) + 4} fontSize={10} fill={c.textSubtle} textAnchor="end">
                  {t === 0 ? "0" : formatCurrencyCompact(t, currency).replace(/\s?\S+$/, "")}
                </SvgText>
              </G>
            ))}

            {months.map((m, i) => {
              const cx = AXIS_W + groupW * i + groupW / 2;
              const isSel = i === selected;
              const opacity = isSel ? 1 : 0.45;
              const hIncome = TOP + plotH - y(m.income);
              const hExpense = TOP + plotH - y(m.expense);
              return (
                <G key={m.key}>
                  {hIncome > 0 && (
                    <Path
                      d={columnPath(cx - BAR_GAP / 2 - barW, y(m.income), barW, hIncome)}
                      fill={c.chartIncome}
                      opacity={opacity}
                    />
                  )}
                  {hExpense > 0 && (
                    <Path
                      d={columnPath(cx + BAR_GAP / 2, y(m.expense), barW, hExpense)}
                      fill={c.chartExpense}
                      opacity={opacity}
                    />
                  )}
                  <SvgText
                    x={cx}
                    y={HEIGHT - 6}
                    fontSize={11}
                    fontWeight={isSel ? "700" : "400"}
                    fill={isSel ? c.text : c.textSubtle}
                    textAnchor="middle"
                  >
                    {m.label.replace(".", "")}
                  </SvgText>
                  {/* Zone de toucher : toute la colonne du mois */}
                  <Rect
                    x={AXIS_W + groupW * i}
                    y={0}
                    width={groupW}
                    height={HEIGHT}
                    fill="transparent"
                    onPress={() => setSelected(i)}
                  />
                </G>
              );
            })}
          </Svg>
        )}
      </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  legend: { flexDirection: "row", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11, fontWeight: "600" },
  detail: { borderRadius: 12, padding: 12, gap: 6 },
  detailMonth: { fontSize: 12, fontWeight: "700" },
  detailRow: { flexDirection: "row", gap: 16 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailValue: { fontSize: 15, fontWeight: "700" },
  detailNet: { fontSize: 12 },
  empty: { borderRadius: 12, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: "700" },
  emptyText: { fontSize: 12, textAlign: "center", lineHeight: 17 },
});
