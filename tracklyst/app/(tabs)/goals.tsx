import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { useGoals } from "@/src/features/goals/hooks/useGoals";
import { formatCurrency } from "@/src/utils/currency";
import { formatDate } from "@/src/utils/date";
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

export default function GoalsScreen() {
  const isDark = useColorScheme() === "dark";
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();

  const { activeBudget, balance } = useActiveBudget();
  const { goals, isLoading, error } = useGoals();

  const totals = useMemo(() => {
    let locked = 0;
    let target = 0;
    let completed = 0;
    for (const g of goals) {
      locked += g.current_amount;
      target += g.target_amount;
      if (g.status === "completed") completed += 1;
    }
    const progressPct = target > 0 ? Math.min((locked / target) * 100, 100) : 0;
    return { locked, target, completed, progressPct };
  }, [goals]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: top, paddingBottom: bottom + 12 },
        isDark && styles.screenDark,
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={styles.headerIconWrap}>
          <IconSymbol
            name="target"
            size={26}
            color={isDark ? "#BBF7D0" : "#14532D"}
          />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>
            Objectifs
          </Text>
          <Text style={[styles.headerSub, isDark && styles.textMuted]}>
            Épargnez pour vos projets importants
          </Text>
        </View>
      </View>

      {/* Overview */}
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, isDark && styles.cardDark]}>
          <Text style={[styles.overviewLabel, isDark && styles.textMuted]}>
            Montant bloqué
          </Text>
          <Text style={[styles.overviewValue, isDark && styles.textLight]}>
            {formatCurrency(totals.locked)}
          </Text>
          <Text style={[styles.overviewHint, isDark && styles.textMuted]}>
            Sur {formatCurrency(totals.target)}
          </Text>
        </View>
        <View style={[styles.overviewCard, isDark && styles.cardDark]}>
          <Text style={[styles.overviewLabel, isDark && styles.textMuted]}>
            Objectifs
          </Text>
          <Text style={[styles.overviewValue, isDark && styles.textLight]}>
            {goals.length}
          </Text>
          <Text style={[styles.overviewHint, isDark && styles.textMuted]}>
            {totals.completed} terminés
          </Text>
        </View>
      </View>

      {/* Balance info */}
      {activeBudget && (
        <View style={[styles.balanceChip, isDark && styles.balanceChipDark]}>
          <IconSymbol
            name="wallet.pass.fill"
            size={14}
            color={isDark ? "#BBF7D0" : "#0D4F3C"}
          />
          <Text style={[styles.balanceChipText, isDark && styles.textLight]}>
            Budget actif :{" "}
            <Text style={{ fontWeight: "700" }}>{activeBudget.name}</Text> ·{" "}
            {formatCurrency(balance?.available_balance ?? 0)} dispo
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && goals.length === 0 && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#10B981" />
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={14}
              color="#B45309"
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isLoading && goals.length === 0 && !error && (
          <View style={styles.empty}>
            <IconSymbol
              name="target"
              size={40}
              color={isDark ? "#4B5563" : "#CBD5E1"}
            />
            <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
              Aucun objectif
            </Text>
            <Text style={[styles.emptySub, isDark && styles.textMuted]}>
              Créez un objectif pour mettre de côté une partie de votre budget.
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => router.push("/(modal)/add-goal")}
            >
              <Text style={styles.emptyBtnText}>Créer un objectif</Text>
            </Pressable>
          </View>
        )}

        {goals.map((g) => {
          const ratio =
            g.target_amount > 0
              ? Math.min(g.current_amount / g.target_amount, 1)
              : 0;
          const pct = Math.round(ratio * 100);
          const color = g.color ?? "#10B981";
          const deadlineLabel = g.deadline
            ? formatDate(g.deadline, { relative: true })
            : "Sans échéance";

          return (
            <Pressable
              key={g.id}
              onPress={() =>
                router.push({
                  pathname: "/(modal)/goal-transfer",
                  params: { goalId: g.id },
                } as any)
              }
              style={({ pressed }) => [
                styles.goalCard,
                isDark && styles.cardDark,
                pressed && styles.goalCardPressed,
              ]}
            >
              <View style={styles.goalHeader}>
                <View
                  style={[
                    styles.goalIcon,
                    { backgroundColor: color + "22" as any },
                  ]}
                >
                  <IconSymbol
                    name="target"
                    size={18}
                    color={color}
                  />
                </View>
                <View style={styles.goalTitleWrap}>
                  <Text
                    style={[styles.goalTitle, isDark && styles.textLight]}
                    numberOfLines={1}
                  >
                    {g.name}
                  </Text>
                  <Text style={[styles.goalSubtitle, isDark && styles.textMuted]}>
                    {deadlineLabel}
                  </Text>
                </View>
                <Text style={[styles.goalStatus, isDark && styles.textMuted]}>
                  {pct}%
                </Text>
              </View>

              <View style={styles.goalProgressBar}>
                <View style={styles.goalProgressTrack}>
                  <View
                    style={[
                      styles.goalProgressFill,
                      { width: `${pct}%` as any, backgroundColor: color },
                    ]}
                  />
                </View>
                <View style={styles.goalAmountsRow}>
                  <Text style={[styles.goalAmount, isDark && styles.textLight]}>
                    {formatCurrency(g.current_amount)}
                  </Text>
                  <Text style={[styles.goalTarget, isDark && styles.textMuted]}>
                    sur {formatCurrency(g.target_amount)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/(modal)/add-goal")}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
          { bottom: bottom + 24 },
        ]}
      >
        <IconSymbol name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
  },
  screenDark: {
    backgroundColor: "#020617",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  headerDark: {
    borderBottomColor: "#1E293B",
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  overviewRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardDark: {
    backgroundColor: "#020617",
    borderColor: "#1E293B",
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
    color: "#0F172A",
  },
  overviewHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    marginBottom: 8,
  },
  balanceChipDark: {
    backgroundColor: "#052e16",
  },
  balanceChipText: {
    fontSize: 12,
    color: "#047857",
  },

  list: {
    flex: 1,
  },

  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
  },

  empty: {
    marginTop: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#10B981",
  },
  emptyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  goalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  goalCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goalIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitleWrap: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  goalSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  goalStatus: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  goalProgressBar: {
    marginTop: 10,
    gap: 6,
  },
  goalProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  goalAmountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  goalTarget: {
    fontSize: 12,
    color: "#64748B",
  },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    shadowOpacity: 0.2,
  },

  textLight: { color: "#F9FAFB" },
  textMuted: { color: "#9CA3AF" },
});
