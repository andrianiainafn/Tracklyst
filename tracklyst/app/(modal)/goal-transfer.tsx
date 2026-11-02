import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Input } from "@/src/components/ui/Input";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useGoalTransactions } from "@/src/features/goals/hooks/useGoalTransactions";
import { goalService } from "@/src/features/goals/services/goalService";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { todayISO } from "@/src/utils/date";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
      const newCurrent = isDeposit
        ? goal.current_amount + amount
        : goal.current_amount - amount;

      await create({
        budget_id: activeBudget.id,
        amount,
        type: isDeposit ? "deposit" : "withdrawal",
        description: description.trim() || undefined,
        date: todayISO(),
      });

      const updatedGoal = await goalService.updateGoal(goal.id, {
        current_amount: newCurrent,
        status: newCurrent >= goal.target_amount ? "completed" : goal.status,
      });
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
                <Text style={[styles.goalName, { color: c.text }]}>{goal.name}</Text>
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
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 18 },
  goalName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
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
