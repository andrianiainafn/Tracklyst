import { AccountChooser } from "@/src/features/accounts/components/AccountChooser";
import { refreshAccounts, useAccountStore } from "@/src/features/accounts/store/accountStore";
import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { IconSymbol } from "@/src/components/ui/icon-symbol";
import { Input } from "@/src/components/ui/Input";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useGoalTransactions } from "@/src/features/goals/hooks/useGoalTransactions";
import { goalService } from "@/src/features/goals/services/goalService";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { todayISO } from "@/src/utils/date";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "deposit" | "withdrawal";

export default function GoalTransferModal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const params = useLocalSearchParams<{ goalId?: string }>();
  const goalId = params.goalId as string | undefined;

  const { activeBudget, balance } = useActiveBudget();
  const { goals, updateGoal } = useGoalStore();
  const goal = useMemo(
    () => goals.find((g) => g.id === goalId),
    [goals, goalId],
  );

  const { create, isLoading } = useGoalTransactions(goalId);
  // Compte d'où vient le versement / où revient le retrait.
  const accounts = useAccountStore((st) => (st.budgetId === activeBudget?.id ? st.accounts : []));
  const accountBalances = useAccountStore((st) => st.balances);
  const [accountChoice, setAccountChoice] = useState<string | null>(null);
  useEffect(() => {
    if (activeBudget?.id) useAccountStore.getState().load(activeBudget.id).catch(() => {});
  }, [activeBudget?.id]);
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const accountId = accountChoice ?? activeAccounts[0]?.id ?? null;
  const goalTransactions = useGoalStore((st) => st.goalTransactions).filter((t) => t.goal_id === goalId);

  const [mode, setMode] = useState<Mode>("deposit");
  const [amountRaw, setAmountRaw] = useState("");
  const [description, setDescription] = useState("");

  const amount = parseFloat(amountRaw.replace(",", ".")) || 0;
  const available = balance?.available_balance ?? 0;
  const canSubmit =
    !!goal &&
    amount > 0 &&
    !isLoading &&
    (mode === "deposit"
      ? amount <= available + 0.0001
      : amount <= goal.current_amount + 0.0001);

  const handleSubmit = async () => {
    if (!goal || !activeBudget?.id) return;
    if (!canSubmit) return;

    try {
      const isDeposit = mode === "deposit";

      await create({
        budget_id: activeBudget.id,
        amount,
        type: isDeposit ? "deposit" : "withdrawal",
        description: description.trim() || undefined,
        date: todayISO(),
        account_id: accountId,
      });
      refreshAccounts();

      // Montant épargné et statut recalculés par la base (migration 00012).
      const updatedGoal = await goalService.getGoal(goal.id);
      updateGoal(goal.id, {
        current_amount: updatedGoal.current_amount,
        status: updatedGoal.status,
      });

      const { setBalance } = useBudgetStore.getState();
      const newBalance = await budgetService.getBalance(activeBudget.id);
      setBalance(newBalance);

      router.back();
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message ?? "Impossible d'enregistrer le mouvement.",
        [{ text: "OK" }],
      );
    }
  };

  const accentColor = mode === "deposit" ? c.tint : c.danger;

  return (
    <>
      <Stack.Screen options={{ title: goal ? goal.name : "Mouvement objectif" }} />

      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: c.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!goal ? (
            <View style={[styles.errorBox, { backgroundColor: c.dangerMuted }]}>
              <Text style={[styles.errorText, { color: c.danger }]}>
                Objectif introuvable. Fermez et réessayez.
              </Text>
            </View>
          ) : (
            <>
              {/* Résumé objectif */}
              <Card>
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalName, { color: c.text, flex: 1 }]}>{goal.name}</Text>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: "/(modal)/add-goal", params: { id: goal.id } } as any)
                    }
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.editBtn,
                      { backgroundColor: c.surfaceAlt },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Ionicons name="create-outline" size={15} color={c.text} />
                    <Text style={[styles.editText, { color: c.text }]}>Modifier</Text>
                  </Pressable>
                </View>
                <Text style={[styles.goalLine, { color: c.textMuted }]}>
                  {formatCurrency(goal.current_amount, activeBudget?.currency)}{" "}
                  sur {formatCurrency(goal.target_amount, activeBudget?.currency)}
                </Text>
                <Text style={[styles.goalLine, { color: c.textMuted }]}>
                  Solde disponible du budget :{" "}
                  <Text style={{ fontWeight: "700", color: c.text }}>
                    {formatCurrency(available, activeBudget?.currency)}
                  </Text>
                </Text>
              </Card>

              {/* Toggle dépôt / retrait */}
              <View style={[styles.modeToggle, { backgroundColor: c.surfaceAlt }]}>
                {(["deposit", "withdrawal"] as Mode[]).map((m) => {
                  const active = mode === m;
                  const label = m === "deposit" ? "Verser" : "Retirer";
                  const color = m === "deposit" ? c.tint : c.danger;
                  const icon =
                    m === "deposit" ? "arrow.down.circle.fill" : "arrow.up.circle.fill";
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMode(m)}
                      style={[styles.modeBtn, active && { backgroundColor: color }]}
                    >
                      <IconSymbol name={icon as any} size={16} color={active ? "#fff" : c.textSubtle} />
                      <Text style={[styles.modeText, { color: c.textMuted }, active && { color: "#fff" }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Montant */}
              <View style={styles.section}>
                <Text style={[styles.label, { color: c.textMuted }]}>Montant</Text>
                <View
                  style={[
                    styles.amountRow,
                    { backgroundColor: c.surface, borderColor: accentColor + "55" },
                  ]}
                >
                  <Text style={[styles.amountUnit, { color: accentColor }]}>
                    {getCurrencySymbol(activeBudget?.currency)}
                  </Text>
                  <TextInput
                    style={[styles.amountInput, { color: c.text }]}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={c.textSubtle}
                    value={amountRaw}
                    onChangeText={setAmountRaw}
                  />
                  {amount > 0 && (
                    <Text style={[styles.amountPretty, { color: c.textMuted }]}>
                      {formatCurrency(amount, activeBudget?.currency)}
                    </Text>
                  )}
                </View>
                <Text style={[styles.helper, { color: c.textSubtle }]}>
                  {mode === "deposit"
                    ? "Ne peut pas dépasser le solde disponible du budget."
                    : "Ne peut pas dépasser le montant déjà épargné dans cet objectif."}
                </Text>
              </View>

              <Input
                label="Note (optionnel)"
                placeholder={
                  mode === "deposit"
                    ? "Ex : Virement mensuel, bonus de salaire…"
                    : "Ex : Utilisation partielle du fonds…"
                }
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={styles.textarea}
              />

              {activeAccounts.length > 0 && activeBudget && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={[styles.historyTitle, { color: c.textSubtle }]}>
                    {mode === "deposit" ? "DEPUIS LE COMPTE" : "VERS LE COMPTE"}
                  </Text>
                  <AccountChooser
                    accounts={accounts}
                    balances={accountBalances}
                    value={accountId}
                    onChange={setAccountChoice}
                    currency={activeBudget.currency}
                  />
                </View>
              )}

              <Button
                label={
                  (mode === "deposit" ? "Verser dans l'objectif" : "Retirer") +
                  (amount > 0 ? ` · ${formatCurrency(amount, activeBudget?.currency)}` : "")
                }
                onPress={handleSubmit}
                disabled={!canSubmit}
                loading={isLoading}
                icon={<IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />}
                style={{ marginTop: 8, backgroundColor: accentColor }}
              />

              {goalTransactions.length > 0 && (
                <View style={{ marginTop: 20, gap: 8 }}>
                  <Text style={[styles.historyTitle, { color: c.textSubtle }]}>HISTORIQUE</Text>
                  <Card padding={0} style={{ overflow: "hidden" }}>
                    {goalTransactions.map((m, i) => {
                      const deposit = m.type === "deposit";
                      return (
                        <Pressable
                          key={m.id}
                          onPress={() => router.push({ pathname: "/(modal)/goal-movement", params: { id: m.id } } as any)}
                          style={({ pressed }) => [
                            styles.historyRow,
                            i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                            pressed && { backgroundColor: c.surfaceAlt },
                          ]}
                        >
                          <View style={[styles.historyIcon, { backgroundColor: deposit ? c.tintMuted : c.dangerMuted }]}>
                            <Ionicons name={deposit ? "arrow-down" : "arrow-up"} size={16} color={deposit ? c.tint : c.danger} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={1} style={[styles.historyLabel, { color: c.text }]}>
                              {m.description || (deposit ? "Versement" : "Retrait")}
                            </Text>
                            <Text style={[styles.historyDate, { color: c.textSubtle }]}>{m.date}</Text>
                          </View>
                          <Text style={[styles.historyAmount, { color: deposit ? c.tint : c.danger }]}>
                            {deposit ? "+" : "−"}
                            {formatCurrency(Number(m.amount), activeBudget?.currency)}
                          </Text>
                          <Ionicons name="create-outline" size={16} color={c.textSubtle} />
                        </Pressable>
                      );
                    })}
                  </Card>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  historyTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  historyIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  historyLabel: { fontSize: 14, fontWeight: "600" },
  historyDate: { fontSize: 12, marginTop: 1 },
  historyAmount: { fontSize: 14, fontWeight: "800" },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 18 },
  goalName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  goalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  editText: { fontSize: 12, fontWeight: "700" },
  goalLine: { fontSize: 12 },
  modeToggle: { flexDirection: "row", borderRadius: Radius.md, padding: 4, gap: 4 },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  modeText: { fontSize: 13, fontWeight: "600" },
  section: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600" },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  amountUnit: { fontSize: 16, fontWeight: "700" },
  amountInput: { flex: 1, fontSize: 18, fontWeight: "700" },
  amountPretty: { fontSize: 12 },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  helper: { fontSize: 11 },
  errorBox: { padding: 14, borderRadius: Radius.md },
  errorText: { fontSize: 13 },
});
