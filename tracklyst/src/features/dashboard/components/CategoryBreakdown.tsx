import { Colors } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import { formatCurrency } from "@/src/utils/currency";
import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import type { CategoryTotal } from "../hooks/useDashboardStats";

/**
 * Dépenses du mois par catégorie : barres classées, une seule teinte
 * (la couleur « dépenses »). L'identité de la catégorie est portée par
 * son icône, pas par la couleur de la barre.
 */
export function CategoryBreakdown({
  categories,
  total,
  monthLabel,
  currency,
}: {
  categories: CategoryTotal[];
  total: number;
  monthLabel: string;
  currency: string;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const top = categories[0]?.amount ?? 1;

  return (
    <Card padding={16} style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>Où part votre argent</Text>
          <Text style={[styles.subtitle, { color: c.textSubtle }]}>
            Dépenses de {monthLabel}
          </Text>
        </View>
        <Text style={[styles.total, { color: c.text }]}>{formatCurrency(Math.round(total), currency)}</Text>
      </View>

      {categories.length === 0 ? (
        <Text style={[styles.empty, { color: c.textSubtle }]}>Aucune dépense ce mois-ci.</Text>
      ) : (
        <View style={styles.rows}>
          {categories.map((cat) => (
            <View key={cat.id} style={styles.row}>
              <CategoryIcon
                category={{ ...cat, type: "expense" }}
                color={cat.color ?? c.textMuted}
                size={34}
              />
              <View style={styles.body}>
                <View style={styles.top}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text style={[styles.amount, { color: c.text }]}>
                    {formatCurrency(Math.round(cat.amount), currency)}
                  </Text>
                  <Text style={[styles.share, { color: c.textSubtle }]}>
                    {Math.round(cat.share * 100)} %
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.max(2, (cat.amount / top) * 100)}%` as any,
                        backgroundColor: c.chartExpense,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2 },
  total: { fontSize: 16, fontWeight: "800" },
  empty: { fontSize: 13, textAlign: "center", paddingVertical: 12 },
  rows: { gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { flex: 1, gap: 6 },
  top: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: "600" },
  amount: { fontSize: 13, fontWeight: "700" },
  share: { fontSize: 11, fontWeight: "600", width: 34, textAlign: "right" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
