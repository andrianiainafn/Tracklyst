import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { accountName } from "@/src/features/accounts/components/AccountIcon";
import { accountService } from "@/src/features/accounts/services/accountService";
import { useAccountStore } from "@/src/features/accounts/store/accountStore";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { AccountPicker } from "@/src/features/budgets/components/AccountPicker";
import type { AccountKind } from "@/src/features/budgets/constants/accountLabels";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { getErrorMessage } from "@/src/utils/errors";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const parse = (raw: string) => {
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Ajout (sans id) ou modification d'un compte du budget actif. */
export default function AccountFormModal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { activeBudget } = useActiveBudget();
  const { accounts, balances, load } = useAccountStore();
  const existing = id ? accounts.find((a) => a.id === id) : undefined;
  const currency = activeBudget?.currency ?? "MGA";

  const [kind, setKind] = useState<AccountKind | null>((existing?.kind as AccountKind) ?? null);
  const [name, setName] = useState(existing?.name ?? "");
  // Solde actuel saisi (ce que montre MVola, le relevé bancaire…).
  const shownBalance = existing ? Math.round(balances[existing.id] ?? 0) : 0;
  const [balanceRaw, setBalanceRaw] = useState(existing ? String(shownBalance) : "");
  const desired = parse(balanceRaw);
  const balanceChanged = !!existing && balanceRaw.trim() !== "" && desired !== shownBalance;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: existing ? accountName(existing) : "Nouveau compte" });
  }, [existing, navigation]);

  const usedNames = accounts.filter((a) => a.id !== existing?.id && a.kind === kind && a.name).map((a) => a.name as string);
  const canSave = !!activeBudget && !!kind && !saving;

  const run = async (fn: () => Promise<unknown>) => {
    if (!activeBudget) return;
    setSaving(true);
    try {
      await fn();
      await load(activeBudget.id);
      // Le solde de départ d'un compte compte dans le total du budget.
      useBudgetStore.getState().setBalance(await budgetService.getBalance(activeBudget.id));
      router.back();
    } catch (err) {
      Alert.alert("Compte", getErrorMessage(err, "Enregistrement impossible."));
      setSaving(false);
    }
  };

  const save = () => {
    if (!canSave || !activeBudget || !kind) return;
    const base = { kind, name: name.trim() || null };
    run(async () => {
      if (!existing) return accountService.createAccount({ ...base, initial_amount: desired, budget_id: activeBudget.id });
      if (!balanceChanged) return accountService.updateAccount(existing, base);
      // Nouveau solde : on corrige le solde de départ de l'écart, calculé sur le solde le plus récent
      // (aucune fausse dépense ni faux revenu dans les statistiques).
      const fresh = await accountService.getBalances(activeBudget.id);
      const gap = desired - (fresh[existing.id] ?? 0);
      return accountService.updateAccount(existing, { ...base, initial_amount: Number(existing.initial_amount) + gap });
    });
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(
      "Supprimer ce compte ?",
      "Ses transactions restent dans le budget, sans compte. Ses transferts sont supprimés. Préférez « Archiver » pour garder l'historique.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => run(() => accountService.deleteAccount(existing.id)) },
      ],
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: c.textSubtle }]}>TYPE ET NOM DU COMPTE</Text>
        <AccountPicker
          kind={kind}
          name={name}
          usedNames={usedNames}
          onChange={(k, n) => {
            setKind(k);
            setName(n);
          }}
        />

        <Input
          label={`Solde actuel du compte (${getCurrencySymbol(currency)})`}
          value={balanceRaw}
          onChangeText={(t) => setBalanceRaw(t.replace(/[^0-9.,\s-]/g, ""))}
          keyboardType="numbers-and-punctuation"
          placeholder="0"
          containerStyle={{ marginTop: 8 }}
        />
        <Text style={[styles.hint, { color: c.textSubtle }]}>
          {existing
            ? "Corrigez-le si le montant réel diffère (solde affiché par MVola, votre relevé…). Le total du budget suit ; vos dépenses et revenus ne changent pas."
            : "L'argent présent sur ce compte aujourd'hui (0 si vous allez y transférer de l'argent)."}
        </Text>
        {balanceChanged && (
          <View style={[styles.balance, { backgroundColor: c.tintMuted }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>
              Ajustement de {desired - shownBalance > 0 ? "+" : "−"}
              {formatCurrency(Math.abs(desired - shownBalance), currency)} sur ce compte (avant :{" "}
              {formatCurrency(shownBalance, currency)}).
            </Text>
          </View>
        )}

        <Button label={existing ? "Enregistrer" : "Ajouter le compte"} onPress={save} disabled={!canSave} loading={saving} style={{ marginTop: 8 }} />

        {existing && (
          <View style={styles.row}>
            <Button
              label={existing.is_archived ? "Réactiver" : "Archiver"}
              variant="secondary"
              icon={<Ionicons name="archive-outline" size={18} color={c.text} />}
              onPress={() => run(() => accountService.updateAccount(existing, { is_archived: !existing.is_archived }))}
              style={{ flex: 1 }}
            />
            <Button
              label="Supprimer"
              variant="destructive"
              icon={<Ionicons name="trash-outline" size={18} color={c.danger} />}
              onPress={remove}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  balance: { padding: 14, borderRadius: Radius.md },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 17 },
  row: { flexDirection: "row", gap: 10, marginTop: 4 },
});
