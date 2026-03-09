import { useBudgets } from "@/src/features/budgets/hooks/useBudgets";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import type { Budget } from "@/src/features/budgets/types/budget.types";
import { goalService } from "@/src/features/goals/services/goalService";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import { formatCurrency } from "@/src/utils/currency";
import { todayISO } from "@/src/utils/date";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";

export default function AddGoal() {
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  const { budgets } = useBudgets();
  const { activeBudget } = useBudgetStore();
  const { addGoal } = useGoalStore();

  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(
    activeBudget ?? budgets[0] ?? null,
  );

  // Sync avec budget actif si aucun budget local
  useEffect(() => {
    if (!selectedBudget && activeBudget) setSelectedBudget(activeBudget);
  }, [activeBudget]);

  // Auto-select premier budget si nécessaire
  useEffect(() => {
    if (!selectedBudget && budgets.length > 0) setSelectedBudget(budgets[0]);
  }, [budgets]);

  const [name, setName] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const amount = parseFloat(amountRaw.replace(",", ".")) || 0;
  const canSubmit =
    !!selectedBudget && name.trim().length > 0 && amount > 0 && !isLoading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedBudget) return;
    try {
      setIsLoading(true);
      const created = await goalService.createGoal({
        budget_id: selectedBudget.id,
        name: name.trim(),
        target_amount: amount,
        description: description.trim() || undefined,
        deadline: deadline || undefined,
      });

      // Push dans le store seulement si l'objectif appartient au budget actif
      if (activeBudget?.id === created.budget_id) {
        addGoal(created);
      }

      router.back();
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message ?? "Impossible de créer l'objectif.",
        [{ text: "OK" }],
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    canSubmit,
    selectedBudget,
    name,
    amount,
    description,
    deadline,
    activeBudget?.id,
    addGoal,
  ]);

  const accentColor = "#10B981";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Nouvel objectif",
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Budget sélectionné */}
          {budgets.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.label, isDark && styles.textMuted]}>
                Budget
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {budgets.map((b) => {
                  const isSelected = selectedBudget?.id === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => setSelectedBudget(b)}
                      style={[
                        styles.budgetChip,
                        isDark && styles.budgetChipDark,
                        isSelected && {
                          backgroundColor: accentColor,
                          borderColor: accentColor,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="wallet.pass.fill"
                        size={13}
                        color={isSelected ? "#fff" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.budgetChipText,
                          isDark && styles.textLight,
                          isSelected && { color: "#fff", fontWeight: "700" },
                        ]}
                      >
                        {b.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Nom */}
          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.textMuted]}>
              Nom de l'objectif
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Ex : Fonds d'urgence, Voyage, Nouvelle voiture…"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Montant cible */}
          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.textMuted]}>
              Montant cible
            </Text>
            <View
              style={[
                styles.amountRow,
                isDark && styles.inputDark,
                { borderColor: accentColor + "55" },
              ]}
            >
              <Text style={[styles.amountUnit, { color: accentColor }]}>Ar</Text>
              <TextInput
                style={[styles.amountInput, isDark && styles.textLight]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                value={amountRaw}
                onChangeText={setAmountRaw}
              />
              {amount > 0 && (
                <Text style={[styles.amountPretty, isDark && styles.textMuted]}>
                  {formatCurrency(amount)}
                </Text>
              )}
            </View>
          </View>

          {/* Échéance */}
          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.textMuted]}>
              Échéance (optionnelle)
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder={`Ex : ${todayISO()}`}
              placeholderTextColor="#94A3B8"
              value={deadline ?? ""}
              onChangeText={(v) => setDeadline(v || null)}
            />
            <Text style={[styles.helper, isDark && styles.textMuted]}>
              Format recommandé : AAAA-MM-JJ
            </Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.textMuted]}>
              Description{" "}
              <Text style={{ fontSize: 12, color: "#94A3B8" }}>(optionnel)</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                isDark && styles.inputDark,
              ]}
              placeholder="Détails, conditions, motivation…"
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
                canSubmit && { opacity: 0.9, transform: [{ scale: 0.98 }] },
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
                  Créer l'objectif
                  {amount > 0 ? ` · ${formatCurrency(amount)}` : ""}
                </Text>
              </>
            )}
          </Pressable>
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
  section: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
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
  helper: {
    fontSize: 11,
    color: "#94A3B8",
  },
  budgetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  budgetChipDark: {
    backgroundColor: "#020617",
    borderColor: "#1F2937",
  },
  budgetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
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
  textLight: { color: "#F9FAFB" },
  textMuted: { color: "#9CA3AF" },
});
