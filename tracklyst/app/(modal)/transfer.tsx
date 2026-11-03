import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { AccountChooser } from "@/src/features/accounts/components/AccountChooser";
import { accountService } from "@/src/features/accounts/services/accountService";
import { useAccountStore } from "@/src/features/accounts/store/accountStore";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useCategories } from "@/src/features/categories/hooks/useCategories";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { todayISO } from "@/src/utils/date";
import { getErrorMessage } from "@/src/utils/errors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const parse = (raw: string) => {
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Transfert entre deux comptes du budget (ex. retrait MVola → espèces). */
export default function TransferModal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { activeBudget } = useActiveBudget();
  const { accounts, balances, load } = useAccountStore();
  const { categories } = useCategories(activeBudget?.id);
  const currency = activeBudget?.currency ?? "MGA";
  const active = accounts.filter((a) => !a.is_archived);

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [feeRaw, setFeeRaw] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const from = fromId ?? active[0]?.id ?? null;
  const to = toId && toId !== from ? toId : (active.find((a) => a.id !== from)?.id ?? null);
  const amount = parse(amountRaw);
  const fee = parse(feeRaw);
  const available = from ? (balances[from] ?? 0) : 0;
  // Frais : catégorie « Frais » si elle existe, sinon « Autre dépense », sinon la première dépense.
  const expense = categories.filter((cat) => cat.type === "expense");
  const feeCategory =
    expense.find((cat) => /^frais/i.test(cat.name)) ?? expense.find((cat) => /autre/i.test(cat.name)) ?? expense[0] ?? null;
  const canSave = !!activeBudget && !!from && !!to && amount > 0 && !saving && (fee === 0 || !!feeCategory);

  const submit = async () => {
    if (!canSave || !activeBudget || !from || !to) return;
    setSaving(true);
    try {
      await accountService.createTransfer({
        budget_id: activeBudget.id,
        from_account_id: from,
        to_account_id: to,
        amount,
        fee,
        fee_category_id: feeCategory?.id ?? null,
        description: note.trim() || null,
        date: todayISO(),
      });
      await load(activeBudget.id);
      // Les frais éventuels changent le solde du budget.
      useBudgetStore.getState().setBalance(await budgetService.getBalance(activeBudget.id));
      router.back();
    } catch (err) {
      Alert.alert("Transfert", getErrorMessage(err, "Transfert impossible."));
      setSaving(false);
    }
  };

  if (active.length < 2) {
    return (
      <View style={[styles.empty, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted, textAlign: "center", lineHeight: 21 }}>
          Il faut au moins deux comptes dans ce budget pour faire un transfert. Ajoutez-en un depuis l&apos;écran Comptes.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: c.textSubtle }]}>DEPUIS</Text>
        <AccountChooser accounts={accounts} balances={balances} value={from} onChange={setFromId} currency={currency} />
        <View style={styles.arrow}>
          <MaterialCommunityIcons name="arrow-down" size={22} color={c.textSubtle} />
        </View>
        <Text style={[styles.label, { color: c.textSubtle }]}>VERS</Text>
        <AccountChooser accounts={accounts} balances={balances} value={to} onChange={setToId} currency={currency} exclude={from} />

        <Input
          label={`Montant (${getCurrencySymbol(currency)})`}
          value={amountRaw}
          onChangeText={(t) => setAmountRaw(t.replace(/[^0-9.,\s]/g, ""))}
          keyboardType="numeric"
          placeholder="0"
          autoFocus
          containerStyle={{ marginTop: 12 }}
        />
        <Input
          label={`Frais (facultatif, ${getCurrencySymbol(currency)})`}
          value={feeRaw}
          onChangeText={(t) => setFeeRaw(t.replace(/[^0-9.,\s]/g, ""))}
          keyboardType="numeric"
          placeholder="0"
        />
        <Text style={[styles.hint, { color: c.textSubtle }]}>
          Ex. frais de retrait MVola : enregistrés comme une dépense sur le compte de départ.
        </Text>
        <Input label="Note (facultative)" value={note} onChangeText={setNote} placeholder="Ex : retrait" />

        {amount + fee > available + 0.0001 && amount > 0 && (
          <View style={[styles.warn, { backgroundColor: c.warning + "26" }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>
              Le compte de départ n&apos;a que {formatCurrency(Math.round(available), currency)} : son solde deviendra négatif.
            </Text>
          </View>
        )}

        <Button
          label={amount > 0 ? `Transférer ${formatCurrency(Math.round(amount), currency)}` : "Transférer"}
          onPress={submit}
          disabled={!canSave}
          loading={saving}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  empty: { flex: 1, padding: 32, justifyContent: "center" },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  arrow: { alignItems: "center", marginVertical: -2 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: -4 },
  warn: { padding: 12, borderRadius: Radius.md },
});
