import { Colors, Radius } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import { categoryService } from "@/src/features/categories/services/categoryService";
import type { Category } from "@/src/features/categories/types/category.types";
import { useSubscriptions } from "@/src/features/subscriptions/hooks/useSubscriptions";
import { monthlyCost } from "@/src/features/subscriptions/utils/schedule";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Une semaine ramenée au mois. */
const WEEKS_PER_MONTH = 52 / 12;
const LIMITS_COLOR = "#0EA5E9";
const RECURRING_COLOR = "#8B5CF6";

const parse = (raw: string) => {
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const SALARY_KEY = (budgetId: string) => `salary-plan:salary:${budgetId}`;

/**
 * Simulation, sans rien modifier : « avec ce salaire, une fois les plafonds
 * et les paiements réguliers payés, il me reste combien ? »
 */
export default function SalaryPlanScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { bottom } = useSafeAreaInsets();
  const { activeBudget } = useActiveBudget();
  const budgetId = activeBudget?.id;
  const currency = activeBudget?.currency ?? "MGA";
  const money = (n: number) => formatCurrency(Math.round(n), currency);

  const { active: subscriptions } = useSubscriptions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [salaryRaw, setSalaryRaw] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (budgetId) categoryService.getCategories(budgetId).then(setCategories).catch(() => {});
    }, [budgetId]),
  );

  // Le dernier salaire saisi est gardé sur l'appareil (simple confort).
  useEffect(() => {
    if (!budgetId) return;
    AsyncStorage.getItem(SALARY_KEY(budgetId))
      .then((v) => setSalaryRaw(v ?? ""))
      .catch(() => {})
      .finally(() => setLoaded(budgetId));
  }, [budgetId]);
  useEffect(() => {
    if (budgetId && loaded === budgetId) AsyncStorage.setItem(SALARY_KEY(budgetId), salaryRaw).catch(() => {});
  }, [salaryRaw, budgetId, loaded]);

  const salary = parse(salaryRaw);

  const limits = useMemo(
    () =>
      categories
        .filter((cat) => cat.type === "expense" && Number(cat.monthly_limit ?? 0) > 0)
        .map((cat) => {
          const weekly = cat.limit_period === "week";
          const value = Number(cat.monthly_limit);
          return { cat, weekly, value, monthly: weekly ? value * WEEKS_PER_MONTH : value };
        })
        .sort((a, b) => b.monthly - a.monthly),
    [categories],
  );
  const limited = useMemo(() => new Set(limits.map((l) => l.cat.id)), [limits]);

  // Paiements réguliers dont la catégorie n'a pas déjà un plafond (pas de double compte).
  const recurring = useMemo(
    () =>
      subscriptions
        .filter((s) => s.type === "expense" && !limited.has(s.category_id))
        .map((s) => ({ sub: s, monthly: monthlyCost(s) }))
        .sort((a, b) => b.monthly - a.monthly),
    [subscriptions, limited],
  );

  const limitsTotal = limits.reduce((a, l) => a + l.monthly, 0);
  const recurringTotal = recurring.reduce((a, r) => a + r.monthly, 0);
  const expenses = limitsTotal + recurringTotal;
  const rest = salary - expenses;

  // Barre : part du salaire prise par chaque bloc.
  const base = Math.max(salary, expenses, 1);
  const pct = (n: number) => `${(n / base) * 100}%` as any;

  if (!activeBudget) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted }}>Sélectionnez d&apos;abord un budget.</Text>
      </View>
    );
  }

  const Row = ({ icon, label, detail, amount }: { icon: React.ReactNode; label: string; detail?: string; amount: number }) => (
    <View style={styles.line}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.lineLabel, { color: c.text }]} numberOfLines={1}>
          {label}
        </Text>
        {detail ? <Text style={[styles.lineDetail, { color: c.textSubtle }]}>{detail}</Text> : null}
      </View>
      <Text style={[styles.lineAmount, { color: c.text }]}>− {money(amount)}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]} keyboardShouldPersistTaps="handled">
        {/* Salaire */}
        <Card padding={16} style={{ gap: 10 }}>
          <Text style={[styles.section, { color: c.textSubtle }]}>SI MON SALAIRE EST DE</Text>
          <View style={[styles.salaryWrap, { backgroundColor: c.surfaceAlt, borderColor: salary > 0 ? c.tint : c.border }]}>
            <TextInput
              value={salaryRaw}
              onChangeText={(t) => setSalaryRaw(t.replace(/[^0-9.,]/g, ""))}
              placeholder="0"
              placeholderTextColor={c.textSubtle}
              keyboardType="decimal-pad"
              style={[styles.salaryInput, { color: c.text }]}
            />
            <Text style={[styles.symbol, { color: c.textMuted }]}>{getCurrencySymbol(currency)}</Text>
          </View>
        </Card>

        {/* Résultat */}
        <Card padding={16} style={{ gap: 12 }}>
          <Text style={[styles.section, { color: c.textSubtle }]}>IL ME RESTE</Text>
          <Text style={[styles.restValue, { color: rest < 0 ? c.danger : c.tint }]}>{money(rest)}</Text>
          {salary > 0 && (
            <Text style={[styles.lineDetail, { color: rest < 0 ? c.danger : c.textMuted }]}>
              {rest < 0
                ? `Il manque ${money(-rest)} : les dépenses prévues dépassent ce salaire.`
                : `Soit ${Math.round((rest / salary) * 100)} % du salaire, environ ${money(rest / WEEKS_PER_MONTH)} par semaine.`}
            </Text>
          )}

          <View style={[styles.bar, { backgroundColor: c.surfaceAlt }]}>
            {limitsTotal > 0 && <View style={{ width: pct(limitsTotal), backgroundColor: LIMITS_COLOR }} />}
            {recurringTotal > 0 && <View style={{ width: pct(recurringTotal), backgroundColor: RECURRING_COLOR }} />}
            {rest > 0 && <View style={{ width: pct(rest), backgroundColor: c.tint }} />}
          </View>
          <View style={styles.legend}>
            {(
              [
                ["Plafonds", limitsTotal, LIMITS_COLOR],
                ["Paiements réguliers", recurringTotal, RECURRING_COLOR],
                ["Reste", Math.max(rest, 0), c.tint],
              ] as const
            ).map(([label, value, color]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.legendText, { color: c.textMuted }]}>
                  {label} · {money(value)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Détail des dépenses */}
        <Text style={[styles.section, { color: c.textSubtle, marginTop: 6 }]}>
          DÉPENSES PRÉVUES PAR MOIS · {money(expenses)}
        </Text>
        <Card padding={0} style={{ overflow: "hidden" }}>
          {limits.length === 0 && recurring.length === 0 ? (
            <Text style={[styles.empty, { color: c.textMuted }]}>
              Aucun plafond ni paiement régulier pour l&apos;instant.
            </Text>
          ) : (
            <>
              {limits.map(({ cat, weekly, value, monthly }) => (
                <Row
                  key={cat.id}
                  icon={<CategoryIcon category={cat} size={34} />}
                  label={cat.name}
                  detail={weekly ? `${money(value)} par semaine × 4,3` : "Plafond du mois"}
                  amount={monthly}
                />
              ))}
              {recurring.map(({ sub, monthly }) => (
                <Row
                  key={sub.id}
                  icon={
                    <View style={[styles.subIcon, { backgroundColor: RECURRING_COLOR + "1F" }]}>
                      <MaterialCommunityIcons name="autorenew" size={18} color={RECURRING_COLOR} />
                    </View>
                  }
                  label={sub.description ?? sub.category?.name ?? "Paiement régulier"}
                  detail={sub.frequency === "weekly" ? `${money(Number(sub.amount))} chaque semaine × 4,3` : "Paiement régulier"}
                  amount={monthly}
                />
              ))}
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  salaryWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14 },
  salaryInput: { flex: 1, fontSize: 26, fontWeight: "800", paddingVertical: 10, letterSpacing: -0.5 },
  symbol: { fontSize: 15, fontWeight: "700" },
  restValue: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  bar: { height: 14, borderRadius: 7, overflow: "hidden", flexDirection: "row" },
  legend: { gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, fontWeight: "600" },
  empty: { padding: 16, textAlign: "center", lineHeight: 20 },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  lineLabel: { fontSize: 14, fontWeight: "600" },
  lineDetail: { fontSize: 12, marginTop: 1, lineHeight: 17 },
  lineAmount: { fontSize: 14, fontWeight: "700" },
  subIcon: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
});
