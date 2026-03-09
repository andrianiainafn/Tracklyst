import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useGoalTransactions } from "@/src/features/goals/hooks/useGoalTransactions";
import { goalService } from "@/src/features/goals/services/goalService";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import { formatCurrency } from "@/src/utils/currency";
import { todayISO } from "@/src/utils/date";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "deposit" | "withdrawal";

export default function GoalTransferModal() {
  const isDark = useColorScheme() === "dark";
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

      // ✅ Persister le montant dans la DB (sinon le solde/balance ne change pas)
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

  const accentColor = mode === "deposit" ? "#10B981" : "#EF4444";

  return (
    <>
      <Stack.Screen
        options={{
          title: goal ? goal.name : "Mouvement objectif",
          headerShown: true,
          headerStyle: { backgroundColor: "#0D4F3C" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <IconSymbol
                name="xmark.circle.fill"
                size={26}
                color="rgba(255,255,255,0.6)"
              />
            </Pressable>
          ),
          headerLeft: () => null,
        }}
      />

      <KeyboardAvoidingView
        style={[styles.root, isDark && styles.rootDark]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!goal ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Objectif introuvable. Fermez et réessayez.
              </Text>
            </View>
          ) : (
            <>
              {/* Résumé objectif */}
              <View style={[styles.card, isDark && styles.cardDark]}>
                <Text style={[styles.goalName, isDark && styles.textLight]}>
                  {goal.name}
                </Text>
                <Text style={[styles.goalLine, isDark && styles.textMuted]}>
                  {formatCurrency(goal.current_amount)} sur{" "}
                  {formatCurrency(goal.target_amount)}
                </Text>
                <Text style={[styles.goalLine, isDark && styles.textMuted]}>
                  Solde disponible du budget :{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {formatCurrency(available)}
                  </Text>
                </Text>
              </View>

              {/* Toggle dépôt / retrait */}
              <View style={[styles.modeToggle, isDark && styles.modeToggleDark]}>
                {(["deposit", "withdrawal"] as Mode[]).map((m) => {
                  const active = mode === m;
                  const label = m === "deposit" ? "Verser" : "Retirer";
                  const color = m === "deposit" ? "#10B981" : "#EF4444";
                  const icon =
                    m === "deposit"
                      ? "arrow.down.circle.fill"
                      : "arrow.up.circle.fill";
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMode(m)}
                      style={[
                        styles.modeBtn,
                        active && { backgroundColor: color },
                      ]}
                    >
                      <IconSymbol
                        name={icon as any}
                        size={16}
                        color={active ? "#fff" : "#94A3B8"}
                      />
                      <Text
                        style={[
                          styles.modeText,
                          active && { color: "#fff" },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Montant */}
              <View style={styles.section}>
                <Text style={[styles.label, isDark && styles.textMuted]}>
                  Montant
                </Text>
                <View
                  style={[
                    styles.amountRow,
                    isDark && styles.inputDark,
                    { borderColor: accentColor + "55" },
                  ]}
                >
                  <Text style={[styles.amountUnit, { color: accentColor }]}>
                    Ar
                  </Text>
                  <TextInput
                    style={[styles.amountInput, isDark && styles.textLight]}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    value={amountRaw}
                    onChangeText={setAmountRaw}
                  />
                  {amount > 0 && (
                    <Text
                      style={[styles.amountPretty, isDark && styles.textMuted]}
                    >
                      {formatCurrency(amount)}
                    </Text>
                  )}
                </View>
                {mode === "deposit" && (
                  <Text style={[styles.helper, isDark && styles.textMuted]}>
                    Ne peut pas dépasser le solde disponible du budget.
                  </Text>
                )}
                {mode === "withdrawal" && (
                  <Text style={[styles.helper, isDark && styles.textMuted]}>
                    Ne peut pas dépasser le montant déjà épargné dans cet
                    objectif.
                  </Text>
                )}
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={[styles.label, isDark && styles.textMuted]}>
                  Note{" "}
                  <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                    (optionnel)
                  </Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textarea,
                    isDark && styles.inputDark,
                  ]}
                  placeholder={
                    mode === "deposit"
                      ? "Ex : Virement mensuel, bonus de salaire…"
                      : "Ex : Utilisation partielle du fonds…"
                  }
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Bouton */}
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: canSubmit ? accentColor : "#CBD5E1",
                  },
                  pressed &&
                    canSubmit && {
                      opacity: 0.9,
                      transform: [{ scale: 0.98 }],
                    },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.submitText}>
                      {mode === "deposit" ? "Verser dans l'objectif" : "Retirer"}
                      {amount > 0 ? ` · ${formatCurrency(amount)}` : ""}
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  rootDark: {
    backgroundColor: "#020617",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardDark: {
    backgroundColor: "#020617",
    borderColor: "#1E293B",
  },
  goalName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  goalLine: {
    fontSize: 12,
    color: "#64748B",
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modeToggleDark: {
    backgroundColor: "#111827",
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  amountUnit: {
    fontSize: 16,
    fontWeight: "700",
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  amountPretty: {
    fontSize: 12,
    color: "#64748B",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 14,
    color: "#0F172A",
  },
  inputDark: {
    backgroundColor: "#020617",
    borderColor: "#1E293B",
    color: "#F9FAFB",
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  helper: {
    fontSize: 11,
    color: "#94A3B8",
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  textLight: { color: "#F9FAFB" },
  textMuted: { color: "#9CA3AF" },
});

