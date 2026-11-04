import { Colors } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { AccountChooser } from "@/src/features/accounts/components/AccountChooser";
import { refreshAccounts, useAccountStore } from "@/src/features/accounts/store/accountStore";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { goalService } from "@/src/features/goals/services/goalService";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { getErrorMessage } from "@/src/utils/errors";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const parse = (raw: string) => {
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Modifier ou supprimer un versement / retrait d'objectif. */
export default function GoalMovementModal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const movement = useGoalStore((s) => s.goalTransactions.find((t) => t.id === id));
  const currency = useBudgetStore((s) => s.activeBudget?.currency);

  const [amountRaw, setAmountRaw] = useState(movement ? String(Number(movement.amount)) : "");
  const [note, setNote] = useState(movement?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(movement?.account_id ?? null);
  const accounts = useAccountStore((st) => st.accounts);
  const accountBalances = useAccountStore((st) => st.balances);
  const amount = parse(amountRaw);
  const deposit = movement?.type === "deposit";

  useEffect(() => {
    navigation.setOptions({ title: deposit ? "Modifier le versement" : "Modifier le retrait" });
  }, [deposit, navigation]);

  if (!movement) {
    return (
      <View style={[styles.empty, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted }}>Mouvement introuvable.</Text>
      </View>
    );
  }

  /** Recharge le mouvement, l'objectif (montant recalculé par la base) et le solde. */
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      const store = useGoalStore.getState();
      const [goal, list, balance] = await Promise.all([
        goalService.getGoal(movement.goal_id),
        goalService.getGoalTransactions(movement.goal_id),
        budgetService.getBalance(movement.budget_id),
      ]);
      store.updateGoal(goal.id, { current_amount: goal.current_amount, status: goal.status });
      store.setGoalTransactions(list);
      useBudgetStore.getState().setBalance(balance);
      refreshAccounts();
      router.back();
    } catch (err) {
      Alert.alert("Objectif", getErrorMessage(err, "Une erreur est survenue."));
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert(
      deposit ? "Supprimer ce versement ?" : "Supprimer ce retrait ?",
      `${formatCurrency(Number(movement.amount), currency)} · le montant épargné de l'objectif sera recalculé.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => run(() => goalService.deleteGoalTransaction(movement.id)) },
      ],
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Input
          label={`Montant (${getCurrencySymbol(currency)})`}
          value={amountRaw}
          onChangeText={(t) => setAmountRaw(t.replace(/[^0-9.,\s]/g, ""))}
          keyboardType="numeric"
          autoFocus
        />
        {accounts.some((a) => !a.is_archived) && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: c.textSubtle }]}>{deposit ? "DEPUIS LE COMPTE" : "VERS LE COMPTE"}</Text>
            <AccountChooser accounts={accounts} balances={accountBalances} value={accountId} onChange={setAccountId} currency={currency ?? "MGA"} />
          </View>
        )}
        <Input label="Note (facultative)" value={note} onChangeText={setNote} placeholder={deposit ? "Ex : épargne de novembre" : "Ex : achat matériel"} />
        <Text style={[styles.hint, { color: c.textSubtle }]}>
          Le montant épargné de l&apos;objectif et le solde du budget sont recalculés automatiquement.
        </Text>
        <Button
          label={`Enregistrer · ${formatCurrency(amount, currency)}`}
          onPress={() => run(() => goalService.updateGoalTransaction(movement, { amount, description: note.trim() || null, account_id: accountId }))}
          disabled={amount <= 0 || busy}
          loading={busy}
        />
        <Button
          label="Supprimer"
          variant="destructive"
          icon={<Ionicons name="trash-outline" size={18} color={c.danger} />}
          onPress={remove}
          disabled={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 12, lineHeight: 17 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
});
