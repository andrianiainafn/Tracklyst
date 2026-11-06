import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import { categoryService } from "@/src/features/categories/services/categoryService";
import { useCategoryStore } from "@/src/features/categories/store/categoryStore";
import type { Category } from "@/src/features/categories/types/category.types";
import { getCurrencySymbol } from "@/src/utils/currency";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Catégories suggérées en premier : celles qu'on plafonne le plus souvent.
const SUGGESTED = [
  "essence",
  "cotisation familiale",
  "abonnements",
  "petites dépenses",
  "courses",
  "restaurant",
  "loisirs",
];

type Period = "month" | "week";
const periodOf = (cat: Category): Period => (cat.limit_period === "week" ? "week" : "month");

const suggestionRank = (cat: Category) => {
  const i = SUGGESTED.indexOf(cat.name.toLowerCase());
  return i === -1 ? SUGGESTED.length : i;
};

const toInput = (limit: number | null) =>
  limit != null && Number(limit) > 0 ? String(Number(limit)) : "";

const parseLimit = (raw: string): number | null => {
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

export default function MonthlyLimitsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { activeBudget } = useBudgetStore();
  const { updateCategory } = useCategoryStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState<Record<string, Period>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const currencySymbol = getCurrencySymbol(activeBudget?.currency);

  useEffect(() => {
    if (!activeBudget?.id) return;
    categoryService
      .getCategories(activeBudget.id)
      .then((data) => {
        const expenses = data
          .filter((cat) => cat.type === "expense")
          .sort((a, b) => suggestionRank(a) - suggestionRank(b));
        setCategories(expenses);
        setValues(Object.fromEntries(expenses.map((cat) => [cat.id, toInput(cat.monthly_limit)])));
        setPeriods(Object.fromEntries(expenses.map((cat) => [cat.id, periodOf(cat)])));
      })
      .catch((e) => Alert.alert("Erreur", e?.message ?? "Impossible de charger les catégories."))
      .finally(() => setIsLoading(false));
  }, [activeBudget?.id]);

  const changed = useMemo(
    () =>
      categories.filter(
        (cat) =>
          parseLimit(values[cat.id] ?? "") !== (cat.monthly_limit != null ? Number(cat.monthly_limit) : null) ||
          (periods[cat.id] ?? "month") !== periodOf(cat),
      ),
    [categories, values, periods],
  );

  const totalFor = (period: Period) =>
    categories.reduce(
      (acc, cat) => acc + ((periods[cat.id] ?? "month") === period ? (parseLimit(values[cat.id] ?? "") ?? 0) : 0),
      0,
    );
  const total = totalFor("month");
  const totalWeek = totalFor("week");
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  const handleSave = async () => {
    if (changed.length === 0) return router.back();
    try {
      setIsSaving(true);
      const updated = await Promise.all(
        changed.map((cat) =>
          categoryService.updateMonthlyLimit(cat.id, parseLimit(values[cat.id] ?? ""), periods[cat.id] ?? "month"),
        ),
      );
      updated.forEach(updateCategory);
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer les plafonds.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeBudget) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted }}>Sélectionnez d'abord un budget.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.intro, { color: c.textMuted }]}>
          Indiquez combien vous voulez dépenser au maximum pour{" "}
          <Text style={{ fontWeight: "700", color: c.text }}>{activeBudget.name}</Text>, par mois ou par
          semaine (du lundi au dimanche). Laissez vide pour ne pas plafonner.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={c.tint} style={{ marginTop: 24 }} />
        ) : categories.length === 0 ? (
          <Text style={[styles.intro, { color: c.textSubtle, textAlign: "center" }]}>
            Aucune catégorie de dépense dans ce budget. Ajoutez-en une depuis
            l'écran « Nouvelle transaction ».
          </Text>
        ) : (
          <View style={[styles.list, { backgroundColor: c.surface, borderColor: c.border }]}>
            {categories.map((cat, i) => {
              const hasValue = !!parseLimit(values[cat.id] ?? "");
              return (
                <View
                  key={cat.id}
                  style={[
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  ]}
                >
                  <CategoryIcon category={cat} size={38} />
                  <View style={styles.nameCol}>
                    <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <View style={[styles.periods, { backgroundColor: c.surfaceAlt }]}>
                      {(["month", "week"] as const).map((p) => {
                        const on = (periods[cat.id] ?? "month") === p;
                        return (
                          <Pressable
                            key={p}
                            onPress={() => setPeriods((v) => ({ ...v, [cat.id]: p }))}
                            hitSlop={4}
                            style={[styles.period, on && { backgroundColor: c.tint }]}
                          >
                            <Text style={[styles.periodText, { color: on ? "#fff" : c.textMuted }]}>
                              {p === "month" ? "Mois" : "Semaine"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: c.surfaceAlt, borderColor: hasValue ? c.tint : "transparent" },
                    ]}
                  >
                    <TextInput
                      value={values[cat.id] ?? ""}
                      onChangeText={(t) => setValues((v) => ({ ...v, [cat.id]: t.replace(/[^0-9.,]/g, "") }))}
                      placeholder="—"
                      placeholderTextColor={c.textSubtle}
                      keyboardType="decimal-pad"
                      style={[styles.input, { color: c.text }]}
                    />
                    <Text style={[styles.symbol, { color: c.textMuted }]}>{currencySymbol}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + 12, borderTopColor: c.border, backgroundColor: c.surface }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: c.textMuted }]}>Total plafonné / mois</Text>
          <Text style={[styles.totalValue, { color: c.text }]}>
            {fmt(total)} {currencySymbol}
          </Text>
        </View>
        {totalWeek > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.textMuted }]}>Total plafonné / semaine</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>
              {fmt(totalWeek)} {currencySymbol}
            </Text>
          </View>
        )}
        <Button
          label={changed.length > 0 ? "Enregistrer" : "Fermer"}
          onPress={handleSave}
          loading={isSaving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, gap: 16 },
  intro: { fontSize: 13, lineHeight: 19 },
  list: { borderRadius: Radius.lg, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nameCol: { flex: 1, gap: 6 },
  name: { fontSize: 14, fontWeight: "600" },
  periods: { flexDirection: "row", alignSelf: "flex-start", borderRadius: Radius.pill, padding: 2 },
  period: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  periodText: { fontSize: 11, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    minWidth: 110,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "700", paddingVertical: 8, textAlign: "right" },
  symbol: { fontSize: 13, fontWeight: "600", marginLeft: 4 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "800" },
});
