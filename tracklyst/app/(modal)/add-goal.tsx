import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Input } from "@/src/components/ui/Input";
import { useBudgets } from "@/src/features/budgets/hooks/useBudgets";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import type { Budget } from "@/src/features/budgets/types/budget.types";
import { goalService } from "@/src/features/goals/services/goalService";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { formatDate } from "@/src/utils/date";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

export default function AddGoal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  const { budgets } = useBudgets();
  const { activeBudget } = useBudgetStore();
  const { addGoal } = useGoalStore();

  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(
    activeBudget ?? budgets[0] ?? null,
  );

  useEffect(() => {
    if (!selectedBudget && activeBudget) setSelectedBudget(activeBudget);
  }, [activeBudget]);

  useEffect(() => {
    if (!selectedBudget && budgets.length > 0) setSelectedBudget(budgets[0]);
  }, [budgets]);

  const [name, setName] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const deadlineDate = useMemo(
    () => (deadline ? new Date(`${deadline}T00:00:00`) : null),
    [deadline],
  );

  const toISODate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const openDatePicker = useCallback(() => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: deadlineDate ?? new Date(),
        mode: "date",
        minimumDate: new Date(),
        onChange: (_event, selected) => {
          if (selected) setDeadline(toISODate(selected));
        },
      });
    } else {
      setShowDatePicker(true);
    }
  }, [deadlineDate]);

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

      if (activeBudget?.id === created.budget_id) {
        addGoal(created);
      }

      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer l'objectif.", [
        { text: "OK" },
      ]);
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

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: c.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Budget sélectionné */}
          {budgets.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: c.textMuted }]}>Budget</Text>
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
                        { backgroundColor: c.surface, borderColor: c.border },
                        isSelected && { backgroundColor: c.tint, borderColor: c.tint },
                      ]}
                    >
                      <IconSymbol
                        name="wallet.pass.fill"
                        size={13}
                        color={isSelected ? "#fff" : c.textMuted}
                      />
                      <Text
                        style={[
                          styles.budgetChipText,
                          { color: c.text },
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

          <Input
            label="Nom de l'objectif"
            placeholder="Ex : Fonds d'urgence, Voyage, Nouvelle voiture…"
            value={name}
            onChangeText={setName}
          />

          {/* Montant cible */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textMuted }]}>Montant cible</Text>
            <View style={[styles.amountRow, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.amountUnit, { color: c.tint }]}>
                {getCurrencySymbol(selectedBudget?.currency)}
              </Text>
              <TextInput
                style={[styles.amountInput, { color: c.text }]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={c.textSubtle}
                value={amountRaw}
                onChangeText={setAmountRaw}
              />
            </View>
            {amount > 0 && (
              <Text style={[styles.amountPretty, { color: c.textMuted }]}>
                {formatCurrency(amount, selectedBudget?.currency)}
              </Text>
            )}
          </View>

          {/* Échéance */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textMuted }]}>Échéance (optionnelle)</Text>
            <Pressable
              onPress={openDatePicker}
              style={[styles.dateRow, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <IconSymbol name="calendar" size={16} color={c.tint} />
              <Text
                style={[
                  styles.dateText,
                  { color: deadline ? c.text : c.textSubtle },
                  !deadline && { fontWeight: "400", textTransform: "none" },
                ]}
              >
                {deadline ? formatDate(deadline) : "Choisir une date"}
              </Text>
              {deadline && (
                <Pressable onPress={() => setDeadline(null)} hitSlop={10} style={{ padding: 2 }}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={c.textSubtle} />
                </Pressable>
              )}
            </Pressable>

            {showDatePicker && Platform.OS === "ios" && (
              <View style={[styles.pickerWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
                <DateTimePicker
                  value={deadlineDate ?? new Date()}
                  mode="date"
                  display="inline"
                  minimumDate={new Date()}
                  themeVariant={isDark ? "dark" : "light"}
                  onChange={(_event, selected) => {
                    if (selected) setDeadline(toISODate(selected));
                  }}
                />
                <Button label="Terminé" onPress={() => setShowDatePicker(false)} />
              </View>
            )}
          </View>

          <Input
            label="Description (optionnel)"
            placeholder="Détails, conditions, motivation…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />

          <Button
            label={
              amount > 0
                ? `Créer l'objectif · ${formatCurrency(amount, selectedBudget?.currency)}`
                : "Créer l'objectif"
            }
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={isLoading}
            icon={<IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 18 },
  section: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600" },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    gap: 8,
  },
  amountUnit: { fontSize: 16, fontWeight: "700" },
  amountInput: { flex: 1, fontSize: 18, fontWeight: "700", paddingVertical: 12 },
  amountPretty: { fontSize: 12 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  dateText: { flex: 1, fontSize: 14, fontWeight: "500", textTransform: "capitalize" },
  pickerWrap: {
    marginTop: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
    padding: 8,
    gap: 8,
  },
  budgetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  budgetChipText: { fontSize: 12, fontWeight: "600" },
  textarea: { minHeight: 80, textAlignVertical: "top" },
});
