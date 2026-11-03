import { Colors, Radius, Shadow } from "@/constants/theme";
import { StatusBarScrim } from "@/src/components/ui/StatusBarScrim";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { IconSymbol } from "@/src/components/ui/icon-symbol";
import { ProgressRing } from "@/src/components/ui/ProgressRing";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { iconForLabel } from "@/src/features/categories/constants/categoryIcons";
import { useGoals } from "@/src/features/goals/hooks/useGoals";
import type { Goal } from "@/src/features/goals/types/goal.types";
import { formatCurrency, formatCurrencyCompact } from "@/src/utils/currency";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Palette = typeof Colors.light;

const DAY = 86_400_000;

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / DAY);
}

function deadlineLabel(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return "Échéance dépassée";
  if (d === 0) return "Aujourd'hui";
  if (d < 31) return `Dans ${d} jour${d > 1 ? "s" : ""}`;
  const months = Math.round(d / 30.44);
  if (months < 12) return `Dans ${months} mois`;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  currency,
  onPress,
  onLongPress,
  c,
}: {
  goal: Goal;
  currency?: string;
  onPress: () => void;
  onLongPress: () => void;
  c: Palette;
}) {
  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const ratio = target > 0 ? current / target : 0;
  const done = goal.status === "completed" || ratio >= 1;
  const color = goal.color ?? c.tint;
  const remaining = Math.max(0, target - current);
  const days = goal.deadline ? daysUntil(goal.deadline) : null;
  const overdue = days !== null && days < 0 && !done;
  // Montant à mettre de côté chaque mois pour tenir l'échéance.
  const perMonth =
    !done && days !== null && days > 0 ? remaining / Math.max(1, Math.ceil(days / 30.44)) : null;
  const icon =
    (goal.icon && /^[a-z0-9-]+$/.test(goal.icon) ? goal.icon : null) ??
    iconForLabel(goal.name) ??
    "flag-outline";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.goalCard,
        { backgroundColor: c.surface, borderColor: c.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.goalTop}>
        <ProgressRing progress={ratio} size={56} stroke={5} color={done ? c.tint : color} trackColor={c.surfaceAlt}>
          <MaterialCommunityIcons
            name={done ? "check-bold" : (icon as any)}
            size={22}
            color={done ? c.tint : color}
          />
        </ProgressRing>

        <View style={styles.goalBody}>
          <Text style={[styles.goalName, { color: c.text }]} numberOfLines={1}>
            {goal.name}
          </Text>
          <Text style={[styles.goalAmounts, { color: c.textMuted }]}>
            <Text style={{ color: c.text, fontWeight: "800" }}>{formatCurrency(Math.round(current), currency)}</Text>
            {"  /  "}
            {formatCurrency(Math.round(target), currency)}
          </Text>
          <View style={styles.chips}>
            {done ? (
              <View style={[styles.chip, { backgroundColor: c.tintMuted }]}>
                <Ionicons name="checkmark-circle" size={12} color={c.tint} />
                <Text style={[styles.chipText, { color: c.tint }]}>Atteint</Text>
              </View>
            ) : (
              <View style={[styles.chip, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[styles.chipText, { color: c.text }]}>{Math.round(ratio * 100)} %</Text>
              </View>
            )}
            {goal.deadline && !done && (
              <View style={[styles.chip, { backgroundColor: overdue ? c.dangerMuted : c.surfaceAlt }]}>
                <Ionicons name="calendar-outline" size={12} color={overdue ? c.danger : c.textMuted} />
                <Text style={[styles.chipText, { color: overdue ? c.danger : c.textMuted }]}>
                  {deadlineLabel(goal.deadline)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
      </View>

      {!done && (
        <View style={[styles.goalFooter, { borderTopColor: c.border }]}>
          <Text style={[styles.footerText, { color: c.textMuted }]}>
            Reste <Text style={{ color: c.text, fontWeight: "700" }}>{formatCurrency(Math.round(remaining), currency)}</Text>
          </Text>
          {perMonth !== null && (
            <Text style={[styles.footerText, { color: c.textMuted }]}>
              ≈ <Text style={{ color: c.text, fontWeight: "700" }}>{formatCurrencyCompact(Math.ceil(perMonth), currency)}</Text> / mois
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();

  const { activeBudget, balance } = useActiveBudget();
  const { goals, isLoading, error } = useGoals();
  const currency = activeBudget?.currency;

  const { saved, target, active, completed } = useMemo(() => {
    const active: Goal[] = [];
    const completed: Goal[] = [];
    let saved = 0;
    let target = 0;
    for (const g of goals) {
      if (g.status === "cancelled") continue;
      saved += Number(g.current_amount);
      target += Number(g.target_amount);
      const done = g.status === "completed" || Number(g.current_amount) >= Number(g.target_amount);
      (done ? completed : active).push(g);
    }
    return { saved, target, active, completed };
  }, [goals]);

  const openGoal = (g: Goal) =>
    router.push({ pathname: "/(modal)/goal-transfer", params: { goalId: g.id } } as any);
  const editGoal = (g: Goal) =>
    router.push({ pathname: "/(modal)/add-goal", params: { id: g.id } } as any);

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={[styles.title, { color: c.text }]}>Objectifs</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Épargnez pour vos projets</Text>
        </View>

        {/* Hero */}
        <Card padding={18} style={styles.hero}>
          <ProgressRing
            progress={target > 0 ? saved / target : 0}
            size={96}
            stroke={9}
            color={c.tint}
            trackColor={c.surfaceAlt}
          >
            <Text style={[styles.heroPct, { color: c.text }]}>
              {target > 0 ? Math.round(Math.min(saved / target, 1) * 100) : 0}%
            </Text>
          </ProgressRing>
          <View style={styles.heroBody}>
            <Text style={[styles.heroLabel, { color: c.textMuted }]}>Épargne totale</Text>
            <Text style={[styles.heroValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(Math.round(saved), currency)}
            </Text>
            <Text style={[styles.heroSub, { color: c.textSubtle }]}>
              sur {formatCurrency(Math.round(target), currency)}
            </Text>
            <View style={styles.heroStats}>
              <Text style={[styles.heroStat, { color: c.textMuted }]}>
                <Text style={{ color: c.text, fontWeight: "800" }}>{active.length}</Text> en cours
              </Text>
              <Text style={[styles.heroStat, { color: c.textMuted }]}>
                <Text style={{ color: c.text, fontWeight: "800" }}>{completed.length}</Text> atteint{completed.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </Card>

        {activeBudget && (
          <View style={[styles.available, { backgroundColor: c.tintMuted }]}>
            <IconSymbol name="wallet.pass.fill" size={16} color={c.tint} />
            <Text style={[styles.availableText, { color: c.text }]}>
              Disponible à épargner{" "}
              <Text style={{ fontWeight: "800" }}>
                {formatCurrency(Math.round(balance?.available_balance ?? 0), currency)}
              </Text>
            </Text>
          </View>
        )}

        {isLoading && goals.length === 0 && <ActivityIndicator color={c.tint} style={{ marginTop: 16 }} />}

        {error && (
          <View style={[styles.errorBox, { backgroundColor: c.dangerMuted }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.danger} />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        )}

        {!isLoading && goals.length === 0 && !error && (
          <EmptyState
            icon="flag-outline"
            title="Aucun objectif"
            subtitle="Voyage, fonds d'urgence, nouvel équipement… Créez un objectif et suivez votre progression."
            actionLabel="Créer un objectif"
            onAction={() => router.push("/(modal)/add-goal")}
          />
        )}

        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSubtle }]}>EN COURS</Text>
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} currency={currency} onPress={() => openGoal(g)} onLongPress={() => editGoal(g)} c={c} />
            ))}
          </View>
        )}

        {completed.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSubtle }]}>ATTEINTS</Text>
            {completed.map((g) => (
              <GoalCard key={g.id} goal={g} currency={currency} onPress={() => openGoal(g)} onLongPress={() => editGoal(g)} c={c} />
            ))}
          </View>
        )}
      </ScrollView>
      <StatusBarScrim />

      <Pressable
        onPress={() => router.push("/(modal)/add-goal")}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.tint, bottom: bottom + 90 },
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 13, marginTop: 2 },

  hero: { flexDirection: "row", alignItems: "center", gap: 18 },
  heroPct: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  heroBody: { flex: 1 },
  heroLabel: { fontSize: 12, fontWeight: "600" },
  heroValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.7, marginTop: 2 },
  heroSub: { fontSize: 12, marginTop: 1 },
  heroStats: { flexDirection: "row", gap: 14, marginTop: 10 },
  heroStat: { fontSize: 12 },

  available: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
  },
  availableText: { fontSize: 13, flex: 1 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 4 },

  goalCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 12, ...Shadow.sm },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  goalTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  goalBody: { flex: 1, gap: 4 },
  goalName: { fontSize: 15, fontWeight: "700" },
  goalAmounts: { fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  chipText: { fontSize: 11, fontWeight: "700" },
  goalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  footerText: { fontSize: 12 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: Radius.md, padding: 12 },
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
