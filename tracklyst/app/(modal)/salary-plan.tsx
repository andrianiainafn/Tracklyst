import { Colors, Radius } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import { categoryService } from "@/src/features/categories/services/categoryService";
import type { Category } from "@/src/features/categories/types/category.types";
import { goalService } from "@/src/features/goals/services/goalService";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import type { Goal } from "@/src/features/goals/types/goal.types";
import { useSubscriptions } from "@/src/features/subscriptions/hooks/useSubscriptions";
import { monthlyCost } from "@/src/features/subscriptions/utils/schedule";
import { transactionService } from "@/src/features/transaction/services/transactionService";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Palette = typeof Colors.light;

/** Une semaine ramenée au mois. */
const WEEKS_PER_MONTH = 52 / 12;

const parse = (raw: string) => {
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const clean = (t: string) => t.replace(/[^0-9.,]/g, "");

/** Réglages du plan, gardés sur l'appareil pour chaque budget. */
type Plan = { salary: string; goals: Record<string, string> };
const PLAN_KEY = (budgetId: string) => `salary-plan:${budgetId}`;

function monthRange(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  return { start: `${ym}-01`, end: `${ym}-${pad(last)}` };
}

/** Nombre de mois (au moins 1) d'ici l'échéance de l'objectif. */
function monthsLeft(deadline: string | null) {
  if (!deadline) return null;
  const now = new Date();
  const d = new Date(`${deadline}T00:00:00`);
  const months = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
  return Math.max(1, months);
}

/** Ce qu'il faudrait verser par mois pour atteindre l'objectif à temps (sinon ce qu'il manque). */
function suggestedFor(goal: Goal) {
  const missing = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
  const months = monthsLeft(goal.deadline);
  return months ? missing / months : missing;
}

function Line({
  c,
  icon,
  label,
  detail,
  amount,
  currency,
  muted,
}: {
  c: Palette;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  amount: number;
  currency: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.line}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.lineLabel, { color: c.text }]} numberOfLines={1}>
          {label}
        </Text>
        {detail ? <Text style={[styles.lineDetail, { color: c.textSubtle }]}>{detail}</Text> : null}
      </View>
      <Text style={[styles.lineAmount, { color: muted ? c.textSubtle : c.text }]}>
        − {formatCurrency(Math.round(amount), currency)}
      </Text>
    </View>
  );
}

/**
 * Plan du salaire : salaire − plafonds − paiements réguliers = reste,
 * puis répartition du reste entre les objectifs (versements en un appui).
 */
export default function SalaryPlanScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { activeBudget } = useActiveBudget();
  const budgetId = activeBudget?.id;
  const currency = activeBudget?.currency ?? "MGA";
  const money = (n: number) => formatCurrency(Math.round(n), currency);

  const { active: subscriptions } = useSubscriptions();
  const allGoals = useGoalStore((s) => s.goals);
  const goals = useMemo(
    () => allGoals.filter((g) => g.budget_id === budgetId && (g.status === "in_progress" || g.status === "paused")),
    [allGoals, budgetId],
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [incomeThisMonth, setIncomeThisMonth] = useState(0);
  const [plan, setPlan] = useState<Plan>({ salary: "", goals: {} });
  const [loaded, setLoaded] = useState<string | null>(null);

  // Plafonds, revenus du mois et objectifs à jour à chaque ouverture.
  useFocusEffect(
    useCallback(() => {
      if (!budgetId) return;
      categoryService.getCategories(budgetId).then(setCategories).catch(() => {});
      const { start, end } = monthRange();
      transactionService
        .getTransactionsByDateRange(budgetId, start, end)
        .then((txs) =>
          setIncomeThisMonth(txs.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0)),
        )
        .catch(() => {});
      goalService
        .getGoals(budgetId)
        .then((g) => useGoalStore.getState().setGoals(g))
        .catch(() => {});
    }, [budgetId]),
  );

  // Réglages enregistrés pour ce budget.
  useEffect(() => {
    if (!budgetId) return;
    AsyncStorage.getItem(PLAN_KEY(budgetId))
      .then((raw) => setPlan(raw ? { salary: "", goals: {}, ...JSON.parse(raw) } : { salary: "", goals: {} }))
      .catch(() => {})
      .finally(() => setLoaded(budgetId));
  }, [budgetId]);
  useEffect(() => {
    if (!budgetId || loaded !== budgetId) return;
    AsyncStorage.setItem(PLAN_KEY(budgetId), JSON.stringify(plan)).catch(() => {});
  }, [plan, budgetId, loaded]);

  const salary = parse(plan.salary);

  // Plafonds ramenés au mois.
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
  const limitedCats = useMemo(() => new Set(limits.map((l) => l.cat.id)), [limits]);

  // Paiements réguliers hors catégories déjà plafonnées (pas de double compte).
  const recurring = useMemo(
    () =>
      subscriptions
        .filter((s) => s.type === "expense")
        .map((s) => ({ sub: s, monthly: monthlyCost(s), inLimit: limitedCats.has(s.category_id) }))
        .sort((a, b) => b.monthly - a.monthly),
    [subscriptions, limitedCats],
  );

  const limitsTotal = limits.reduce((a, l) => a + l.monthly, 0);
  const recurringTotal = recurring.filter((r) => !r.inLimit).reduce((a, r) => a + r.monthly, 0);
  const expenses = limitsTotal + recurringTotal;
  const rest = salary - expenses;

  const allocated = goals.reduce((a, g) => a + parse(plan.goals[g.id] ?? ""), 0);
  const free = rest - allocated;

  const setGoalAmount = (id: string, value: string) =>
    setPlan((p) => ({ ...p, goals: { ...p.goals, [id]: value } }));

  /** Répartit le reste selon ce que chaque objectif demande (échéance ou montant manquant). */
  const autoSplit = () => {
    if (rest <= 0 || goals.length === 0) return;
    const wants = goals.map((g) => ({ g, want: suggestedFor(g) }));
    const totalWant = wants.reduce((a, w) => a + w.want, 0);
    const next: Record<string, string> = {};
    for (const { g, want } of wants) {
      const share = totalWant <= rest ? want : totalWant > 0 ? (rest * want) / totalWant : rest / goals.length;
      next[g.id] = share > 0 ? String(Math.floor(share)) : "";
    }
    setPlan((p) => ({ ...p, goals: next }));
  };
  const evenSplit = () => {
    if (rest <= 0 || goals.length === 0) return;
    const each = Math.floor(rest / goals.length);
    setPlan((p) => ({ ...p, goals: Object.fromEntries(goals.map((g) => [g.id, String(each)])) }));
  };

  if (!activeBudget) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted }}>Sélectionnez d&apos;abord un budget.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]} keyboardShouldPersistTaps="handled">
        {/* 1. Salaire */}
        <Card padding={16} style={{ gap: 10 }}>
          <Text style={[styles.section, { color: c.textSubtle }]}>MON SALAIRE DU MOIS</Text>
          <View style={[styles.salaryWrap, { backgroundColor: c.surfaceAlt, borderColor: salary > 0 ? c.tint : c.border }]}>
            <TextInput
              value={plan.salary}
              onChangeText={(t) => setPlan((p) => ({ ...p, salary: clean(t) }))}
              placeholder="0"
              placeholderTextColor={c.textSubtle}
              keyboardType="decimal-pad"
              style={[styles.salaryInput, { color: c.text }]}
            />
            <Text style={[styles.symbol, { color: c.textMuted }]}>{getCurrencySymbol(currency)}</Text>
          </View>
          {incomeThisMonth > 0 && Math.round(incomeThisMonth) !== Math.round(salary) && (
            <Pressable
              onPress={() => setPlan((p) => ({ ...p, salary: String(Math.round(incomeThisMonth)) }))}
              style={({ pressed }) => [styles.hintChip, { backgroundColor: c.tintMuted }, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="arrow-down-circle-outline" size={16} color={c.tint} />
              <Text style={[styles.hintChipText, { color: c.tint }]}>
                Utiliser les revenus reçus ce mois : {money(incomeThisMonth)}
              </Text>
            </Pressable>
          )}
        </Card>

        {/* 2. Dépenses prévues */}
        <View style={styles.headerRow}>
          <Text style={[styles.section, { color: c.textSubtle }]}>DÉPENSES PRÉVUES PAR MOIS</Text>
          <Pressable onPress={() => router.push("/(modal)/monthly-limits" as any)} hitSlop={6}>
            <Text style={[styles.link, { color: c.tint }]}>Régler les plafonds</Text>
          </Pressable>
        </View>
        <Card padding={0} style={{ overflow: "hidden" }}>
          {limits.length === 0 && recurring.length === 0 ? (
            <Pressable onPress={() => router.push("/(modal)/monthly-limits" as any)} style={styles.empty}>
              <Text style={{ color: c.textMuted, textAlign: "center", lineHeight: 20 }}>
                Aucun plafond ni paiement régulier. Fixez vos plafonds (essence, courses, cotisation…) pour voir ce
                qu&apos;il vous reste.
              </Text>
            </Pressable>
          ) : (
            <>
              {limits.map(({ cat, weekly, value, monthly }) => (
                <Line
                  key={cat.id}
                  c={c}
                  icon={<CategoryIcon category={cat} size={34} />}
                  label={cat.name}
                  detail={weekly ? `Plafond ${money(value)} / semaine × 4,3` : "Plafond du mois"}
                  amount={monthly}
                  currency={currency}
                />
              ))}
              {recurring.map(({ sub, monthly, inLimit }) => (
                <Line
                  key={sub.id}
                  c={c}
                  icon={
                    <View style={[styles.subIcon, { backgroundColor: "#8B5CF61F" }]}>
                      <MaterialCommunityIcons name="autorenew" size={18} color="#8B5CF6" />
                    </View>
                  }
                  label={sub.description ?? sub.category?.name ?? "Paiement régulier"}
                  detail={
                    inLimit
                      ? "Déjà compté dans le plafond de sa catégorie"
                      : sub.frequency === "weekly"
                        ? `${money(Number(sub.amount))} chaque semaine`
                        : "Paiement régulier"
                  }
                  amount={monthly}
                  currency={currency}
                  muted={inLimit}
                />
              ))}
            </>
          )}
        </Card>

        {/* 3. Reste */}
        <Card padding={16} style={{ gap: 6 }}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.textMuted }]}>Salaire</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>{money(salary)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.textMuted }]}>Dépenses prévues</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>− {money(expenses)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.restLabel, { color: c.text }]}>Il reste</Text>
            <Text style={[styles.restValue, { color: rest < 0 ? c.danger : c.tint }]}>{money(rest)}</Text>
          </View>
          {rest < 0 && salary > 0 && (
            <Text style={[styles.lineDetail, { color: c.danger }]}>
              Vos plafonds dépassent le salaire : baissez-en un ou deux.
            </Text>
          )}
        </Card>

        {/* 4. Répartition sur les objectifs */}
        <View style={styles.headerRow}>
          <Text style={[styles.section, { color: c.textSubtle }]}>RÉPARTIR LE RESTE</Text>
          {goals.length > 0 && rest > 0 && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={evenSplit} hitSlop={6}>
                <Text style={[styles.link, { color: c.tint }]}>Parts égales</Text>
              </Pressable>
              <Pressable onPress={autoSplit} hitSlop={6}>
                <Text style={[styles.link, { color: c.tint }]}>Auto</Text>
              </Pressable>
            </View>
          )}
        </View>

        {goals.length === 0 ? (
          <Card padding={16}>
            <Pressable onPress={() => router.push("/(modal)/add-goal" as any)}>
              <Text style={{ color: c.textMuted, textAlign: "center", lineHeight: 20 }}>
                Aucun objectif en cours.{" "}
                <Text style={{ color: c.tint, fontWeight: "700" }}>Créer un objectif</Text> (terrain, moto, fonds
                d&apos;urgence…)
              </Text>
            </Pressable>
          </Card>
        ) : (
          <Card padding={0} style={{ overflow: "hidden" }}>
            {goals.map((g, i) => {
              const value = parse(plan.goals[g.id] ?? "");
              const missing = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
              const months = monthsLeft(g.deadline);
              const share = rest > 0 ? Math.round((value / rest) * 100) : 0;
              return (
                <View
                  key={g.id}
                  style={[
                    styles.goal,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  ]}
                >
                  <View style={styles.goalTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lineLabel, { color: c.text }]} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text style={[styles.lineDetail, { color: c.textSubtle }]}>
                        Manque {money(missing)}
                        {months ? ` · ${money(missing / months)} / mois pour finir à temps` : ""}
                      </Text>
                    </View>
                    <View style={[styles.goalInputWrap, { backgroundColor: c.surfaceAlt, borderColor: value > 0 ? c.tint : "transparent" }]}>
                      <TextInput
                        value={plan.goals[g.id] ?? ""}
                        onChangeText={(t) => setGoalAmount(g.id, clean(t))}
                        placeholder="0"
                        placeholderTextColor={c.textSubtle}
                        keyboardType="decimal-pad"
                        style={[styles.goalInput, { color: c.text }]}
                      />
                    </View>
                  </View>
                  {value > 0 && (
                    <View style={styles.goalBottom}>
                      <Text style={[styles.lineDetail, { color: c.textSubtle, flex: 1 }]}>
                        {share} % du reste
                      </Text>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/(modal)/goal-transfer",
                            params: { goalId: g.id, amount: String(Math.round(value)) },
                          } as any)
                        }
                        style={({ pressed }) => [styles.payBtn, { backgroundColor: c.tint }, pressed && { opacity: 0.8 }]}
                      >
                        <Ionicons name="arrow-forward-circle-outline" size={15} color="#fff" />
                        <Text style={styles.payText}>Verser {money(value)}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        {/* 5. Libre */}
        <Card padding={16} style={{ gap: 4 }}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.textMuted }]}>Mis de côté pour les objectifs</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>{money(allocated)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.restLabel, { color: c.text }]}>Reste libre</Text>
            <Text style={[styles.restValue, { color: free < 0 ? c.danger : c.text }]}>{money(free)}</Text>
          </View>
          <Text style={[styles.lineDetail, { color: free < 0 ? c.danger : c.textSubtle }]}>
            {free < 0
              ? "Vous répartissez plus que ce qu'il reste : baissez un objectif."
              : "Argent sans destination : imprévus, plaisir… ou un objectif de plus."}
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  link: { fontSize: 13, fontWeight: "700" },
  salaryWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14 },
  salaryInput: { flex: 1, fontSize: 26, fontWeight: "800", paddingVertical: 10, letterSpacing: -0.5 },
  symbol: { fontSize: 15, fontWeight: "700" },
  hintChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill },
  hintChipText: { fontSize: 12, fontWeight: "700" },
  empty: { padding: 16 },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  lineLabel: { fontSize: 14, fontWeight: "600" },
  lineDetail: { fontSize: 12, marginTop: 1 },
  lineAmount: { fontSize: 14, fontWeight: "700" },
  subIcon: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13, fontWeight: "600" },
  totalValue: { fontSize: 15, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  restLabel: { fontSize: 16, fontWeight: "800" },
  restValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  goal: { padding: 14, gap: 8 },
  goalTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  goalInputWrap: { borderRadius: Radius.sm, borderWidth: 1.5, paddingHorizontal: 10, minWidth: 110 },
  goalInput: { fontSize: 15, fontWeight: "700", paddingVertical: 8, textAlign: "right" },
  goalBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  payBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  payText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
