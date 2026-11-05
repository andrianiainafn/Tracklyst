import { pickDateOnWeb } from "@/src/utils/webDatePicker";
import { AccountChooser } from "@/src/features/accounts/components/AccountChooser";
import { useAccountStore } from "@/src/features/accounts/store/accountStore";
import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { IconSymbol } from "@/src/components/ui/icon-symbol";
import { Input } from "@/src/components/ui/Input";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import {
  iconForLabel,
  resolveCategoryIcon,
} from "@/src/features/categories/constants/categoryIcons";
import { useCategories } from "@/src/features/categories/hooks/useCategories";
import { subscriptionService } from "@/src/features/subscriptions/services/subscriptionService";
import { useSubscriptionStore } from "@/src/features/subscriptions/store/subscriptionStore";
import type { SubscriptionFrequency } from "@/src/features/subscriptions/types/subscription.types";
import { toISODate, todayISO } from "@/src/features/subscriptions/utils/schedule";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Raccourcis : un tap remplit le nom.
const SUGGESTIONS = [
  "Netflix",
  "Spotify",
  "Internet",
  "Téléphone",
  "Électricité",
  "Assurance",
  "Salle de sport",
  "Canal+",
];

const FREQUENCIES: { id: SubscriptionFrequency; label: string }[] = [
  { id: "monthly", label: "Mensuel" },
  { id: "yearly", label: "Annuel" },
  { id: "weekly", label: "Hebdo" },
];

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export default function AddSubscriptionScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { activeBudget } = useBudgetStore();
  const { categories } = useCategories(activeBudget?.id);
  const { subscriptions, upsertSubscription, removeSubscription } =
    useSubscriptionStore();
  const existing = id ? subscriptions.find((s) => s.id === id) : undefined;
  const isEditing = !!existing;

  const [name, setName] = useState(existing?.description ?? "");
  const [amountRaw, setAmountRaw] = useState(
    existing ? String(Number(existing.amount)) : "",
  );
  const [frequency, setFrequency] = useState<SubscriptionFrequency>(
    existing && existing.frequency !== "daily" ? existing.frequency : "monthly",
  );
  const [nextDate, setNextDate] = useState(
    existing?.next_occurrence ?? todayISO(),
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    existing?.category_id ?? null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accountChoice, setAccountChoice] = useState<string | null>(existing?.account_id ?? null);
  const accounts = useAccountStore((st) => (st.budgetId === activeBudget?.id ? st.accounts : []));
  const accountBalances = useAccountStore((st) => st.balances);
  useEffect(() => {
    if (activeBudget) useAccountStore.getState().load(activeBudget.id).catch(() => {});
  }, [activeBudget?.id]);
  const accountId = accountChoice ?? accounts.find((a) => !a.is_archived)?.id ?? null;

  const expenseCats = useMemo(
    () => categories.filter((cat) => cat.type === "expense"),
    [categories],
  );

  // Catégorie « Abonnements » présélectionnée si elle existe.
  useEffect(() => {
    if (categoryId || expenseCats.length === 0) return;
    const fallback =
      expenseCats.find((cat) => cat.name.toLowerCase() === "abonnements") ??
      expenseCats[0];
    setCategoryId(fallback.id);
  }, [expenseCats, categoryId]);

  const amount = parseFloat(amountRaw.replace(/\s/g, "").replace(",", ".")) || 0;
  const canSubmit =
    !!activeBudget && name.trim().length > 0 && amount > 0 && !!categoryId && !isSaving;

  const openDatePicker = useCallback(() => {
    const value = new Date(`${nextDate}T00:00:00`);
    if (Platform.OS === "web") {
      pickDateOnWeb({ value: nextDate, onPick: setNextDate });
      return;
    }
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        onChange: (_event, selected) => {
          if (selected) setNextDate(toISODate(selected));
        },
      });
    } else {
      setShowDatePicker(true);
    }
  }, [nextDate]);

  const handleSubmit = async () => {
    if (!canSubmit || !activeBudget || !categoryId) return;
    try {
      setIsSaving(true);
      const saved = existing
        ? await subscriptionService.updateSubscription(existing.id, {
            description: name.trim(),
            amount,
            category_id: categoryId,
            account_id: accountId,
            frequency,
            // La date choisie devient la nouvelle ancre du calendrier.
            ...(nextDate !== existing.next_occurrence && {
              next_occurrence: nextDate,
              start_date: nextDate,
            }),
          })
        : await subscriptionService.createSubscription({
            budget_id: activeBudget.id,
            category_id: categoryId,
            account_id: accountId,
            amount,
            description: name.trim(),
            frequency,
            start_date: nextDate,
          });
      upsertSubscription(saved);
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer l'abonnement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!existing) return;
    try {
      const saved = await subscriptionService.updateSubscription(existing.id, {
        is_active: !existing.is_active,
      });
      upsertSubscription(saved);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Action impossible.");
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert(
      "Supprimer l'abonnement ?",
      "Les dépenses déjà enregistrées sont conservées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await subscriptionService.deleteSubscription(existing.id);
              removeSubscription(existing.id);
              router.back();
            } catch (e: any) {
              Alert.alert("Erreur", e?.message ?? "Suppression impossible.");
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nom */}
        <Input
          label="Nom"
          placeholder="Ex : Netflix, Internet, assurance…"
          value={name}
          onChangeText={setName}
          maxLength={60}
        />
        {!isEditing && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {SUGGESTIONS.map((s) => {
              const selected = name === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setName(s)}
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? c.tintMuted : c.surface, borderColor: selected ? c.tint : c.border },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={iconForLabel(s) ?? "autorenew"}
                    size={16}
                    color={selected ? c.tint : c.textMuted}
                  />
                  <Text style={[styles.chipText, { color: selected ? c.tint : c.textMuted }]}>{s}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Montant */}
        <Input
          label={`Montant (${getCurrencySymbol(activeBudget?.currency)})`}
          placeholder="0"
          value={amountRaw}
          onChangeText={(t) => setAmountRaw(t.replace(/[^0-9.,]/g, ""))}
          keyboardType="decimal-pad"
        />

        {/* Fréquence */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.textMuted }]}>Fréquence</Text>
          <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
            {FREQUENCIES.map((f) => {
              const selected = frequency === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFrequency(f.id)}
                  style={[styles.segmentItem, selected && { backgroundColor: c.surface }]}
                >
                  <Text style={[styles.segmentText, { color: selected ? c.text : c.textMuted }]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Prochaine échéance */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.textMuted }]}>Prochain prélèvement</Text>
          <Pressable
            onPress={openDatePicker}
            style={[styles.dateRow, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <IconSymbol name="calendar" size={16} color={c.tint} />
            <Text style={[styles.dateText, { color: c.text }]}>{formatDate(nextDate)}</Text>
          </Pressable>
          {showDatePicker && Platform.OS === "ios" && (
            <View style={[styles.pickerWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
              <DateTimePicker
                value={new Date(`${nextDate}T00:00:00`)}
                mode="date"
                display="inline"
                themeVariant={isDark ? "dark" : "light"}
                onChange={(_event, selected) => {
                  if (selected) setNextDate(toISODate(selected));
                }}
              />
              <Button label="Terminé" onPress={() => setShowDatePicker(false)} />
            </View>
          )}
          <Text style={[styles.hint, { color: c.textSubtle }]}>
            On vous rappellera ce jour-là de valider la dépense. Rien n'est débité
            automatiquement.
          </Text>
        </View>

        {/* Compte prélevé */}
        {accounts.some((a) => !a.is_archived) && activeBudget && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: c.textMuted }]}>Prélevé sur le compte</Text>
            <AccountChooser
              accounts={accounts}
              balances={accountBalances}
              value={accountId}
              onChange={setAccountChoice}
              currency={activeBudget.currency}
            />
          </View>
        )}

        {/* Catégorie */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.textMuted }]}>Catégorie</Text>
          <View style={styles.catWrap}>
            {expenseCats.map((cat) => {
              const selected = categoryId === cat.id;
              const color = cat.color ?? "#6B7280";
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? color + "20" : c.surface, borderColor: selected ? color : c.border },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={resolveCategoryIcon(cat)}
                    size={16}
                    color={selected ? color : c.textMuted}
                  />
                  <Text style={[styles.chipText, { color: selected ? color : c.textMuted }]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label={
            isEditing
              ? "Enregistrer"
              : amount > 0
                ? `Ajouter · ${formatCurrency(amount, activeBudget?.currency)}`
                : "Ajouter l'abonnement"
          }
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSaving}
        />

        {isEditing && (
          <View style={styles.editActions}>
            <Button
              label={existing.is_active ? "Mettre en pause" : "Réactiver"}
              variant="secondary"
              onPress={handleToggleActive}
              style={{ flex: 1 }}
            />
            <Button label="Supprimer" variant="destructive" onPress={handleDelete} style={{ flex: 1 }} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  section: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, lineHeight: 17 },
  chips: { gap: 8, marginTop: -6 },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  segment: { flexDirection: "row", borderRadius: Radius.md, padding: 4 },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  segmentText: { fontSize: 13, fontWeight: "700" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { fontSize: 15, fontWeight: "600", textTransform: "capitalize" },
  pickerWrap: { borderWidth: 1, borderRadius: Radius.md, padding: 8, gap: 8 },
  editActions: { flexDirection: "row", gap: 10 },
});
