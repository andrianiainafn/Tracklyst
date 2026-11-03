import { Colors, Radius, Shadow } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { AccountPicker } from "@/src/features/budgets/components/AccountPicker";
import type { AccountKind } from "@/src/features/budgets/constants/accountLabels";
import { BUDGET_THEMES, resolveBudgetTheme } from "@/src/features/budgets/constants/budgetThemes";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { sharingService } from "@/src/features/budgets/services/sharingService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { supabase } from "@/src/lib/supabase";
import { getErrorMessage } from "@/src/utils/errors";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CURRENCIES = [
  { code: "MGA", symbol: "Ar", label: "Ariary malgache" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dollar américain" },
];

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

// ─── Preview card ─────────────────────────────────────────────────────────────
function PreviewCard({
  name,
  currency,
  theme,
  initialAmount,
  c,
}: {
  name: string;
  currency: (typeof CURRENCIES)[0];
  theme: (typeof BUDGET_THEMES)[0];
  initialAmount: number;
  c: typeof Colors.light;
}) {
  return (
    <Card padding={16}>
      <View style={previewStyles.header}>
        <View style={previewStyles.titleRow}>
          <View style={[previewStyles.dot, { backgroundColor: theme.to }]} />
          <Text style={[previewStyles.name, { color: c.text }]} numberOfLines={1}>
            {name || "Nom du budget"}
          </Text>
        </View>
        <View style={[previewStyles.badge, { backgroundColor: c.surfaceAlt }]}>
          <Text style={[previewStyles.badgeText, { color: c.textMuted }]}>
            {currency.code}
          </Text>
        </View>
      </View>

      <Text style={[previewStyles.balanceLabel, { color: c.textSubtle }]}>
        SOLDE DISPONIBLE
      </Text>
      <Text style={[previewStyles.balance, { color: c.text }]}>
        {initialAmount > 0 ? fmt(initialAmount) : "0"}
        <Text style={[previewStyles.balanceCurrency, { color: c.textMuted }]}>
          {" "}
          {currency.symbol}
        </Text>
      </Text>

      <View style={[previewStyles.statsRow, { backgroundColor: c.surfaceAlt }]}>
        <View style={previewStyles.statItem}>
          <Text style={[previewStyles.statVal, { color: c.tint }]}>
            +{initialAmount > 0 ? fmt(initialAmount) : "0"}
          </Text>
          <Text style={[previewStyles.statLbl, { color: c.textSubtle }]}>Initial</Text>
        </View>
        <View style={[previewStyles.statDivider, { backgroundColor: c.border }]} />
        <View style={previewStyles.statItem}>
          <Text style={[previewStyles.statVal, { color: c.text }]}>-0</Text>
          <Text style={[previewStyles.statLbl, { color: c.textSubtle }]}>Dépenses</Text>
        </View>
        <View style={[previewStyles.statDivider, { backgroundColor: c.border }]} />
        <View style={previewStyles.statItem}>
          <Text style={[previewStyles.statVal, { color: c.text }]}>0</Text>
          <Text style={[previewStyles.statLbl, { color: c.textSubtle }]}>Objectifs</Text>
        </View>
      </View>
    </Card>
  );
}

const previewStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontSize: 14, fontWeight: "700", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  balanceLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.8 },
  balance: { fontSize: 26, fontWeight: "800", letterSpacing: -1, marginTop: 2, marginBottom: 12 },
  balanceCurrency: { fontSize: 14, fontWeight: "600" },
  statsRow: { flexDirection: "row", borderRadius: 10, padding: 10 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1 },
  statVal: { fontSize: 11, fontWeight: "700" },
  statLbl: { fontSize: 9 },
});

function SectionLabel({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{label}</Text>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AddBudgetScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { bottom } = useSafeAreaInsets();
  const c = isDark ? Colors.dark : Colors.light;

  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const { budgets, addBudget, setActiveBudget } = useBudgetStore();
  // Mode modification quand un id est passé (même écran que la création).
  const existing = params.id ? budgets.find((b) => b.id === params.id) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState("");
  const [initialAmountRaw, setInitialAmountRaw] = useState(
    existing && Number(existing.initial_amount ?? 0) > 0 ? String(Number(existing.initial_amount)) : "",
  );
  const [selectedTheme, setSelectedTheme] = useState(existing ? resolveBudgetTheme(existing) : BUDGET_THEMES[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(
    CURRENCIES.find((cur) => cur.code === existing?.currency) ?? CURRENCIES[0],
  );
  const [accountKindValue, setAccountKindValue] = useState<AccountKind | null>(
    (existing?.account_kind as AccountKind | null | undefined) ?? null,
  );
  const [accountName, setAccountName] = useState(existing?.account_name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Noms de comptes déjà utilisés (suggestions).
  const usedAccountNames = budgets
    .filter((b) => b.account_kind === accountKindValue && b.account_name)
    .map((b) => b.account_name as string);
  const account = {
    account_kind: accountKindValue,
    account_name: accountKindValue ? accountName.trim() || null : null,
  };
  // Rôle sur un budget partagé : seul le propriétaire peut supprimer.
  const [role, setRole] = useState<string | null>(existing && existing.owner_type === "user" ? "owner" : null);

  useEffect(() => {
    if (existing) navigation.setOptions({ title: "Modifier le budget" });
  }, [existing, navigation]);

  useEffect(() => {
    if (!existing || existing.owner_type !== "group") return;
    let cancelled = false;
    sharingService
      .members(existing.id)
      .then((list) => !cancelled && setRole(list.find((m) => m.is_me)?.role ?? "member"))
      .catch(() => !cancelled && setRole("member"));
    return () => {
      cancelled = true;
    };
  }, [existing]);

  const canEdit = !existing || role === "owner" || role === "admin";
  const canDelete = !!existing && role === "owner";

  const handleUpdate = async () => {
    if (!existing) return;
    setIsSubmitting(true);
    try {
      const updated = await budgetService.updateBudget(existing.id, {
        name: name.trim(),
        theme: selectedTheme.id,
        initial_amount: initialAmount,
        ...account,
      });
      useBudgetStore.getState().updateBudget(existing.id, updated);
      router.back();
    } catch (err) {
      Alert.alert("Modification impossible", getErrorMessage(err, "Une erreur est survenue."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    const shared = existing.owner_type === "group";
    Alert.alert(
      `Supprimer « ${existing.name} » ?`,
      `Toutes ses transactions, catégories, plafonds, objectifs et abonnements seront supprimés définitivement${
        shared ? ", pour tous les membres" : ""
      }.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () =>
            Alert.alert("Dernière confirmation", `La suppression de « ${existing.name} » est irréversible.`, [
              { text: "Annuler", style: "cancel" },
              {
                text: "Supprimer définitivement",
                style: "destructive",
                onPress: async () => {
                  try {
                    await budgetService.deleteBudget(existing.id);
                    // Budget partagé : le groupe associé n'a plus d'usage.
                    if (shared) await supabase.from("groups").delete().eq("id", existing.owner_id);
                    useBudgetStore.getState().deleteBudget(existing.id);
                    router.dismissAll();
                  } catch (err) {
                    Alert.alert("Suppression impossible", getErrorMessage(err, "Une erreur est survenue."));
                  }
                },
              },
            ]),
        },
      ],
    );
  };

  const initialAmount = parseAmount(initialAmountRaw);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existing) return handleUpdate();

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        Alert.alert("Non connecté", "Veuillez vous reconnecter.");
        return;
      }

      const dto = {
        name: trimmed,
        owner_type: "user" as const,
        owner_id: user.id,
        currency: selectedCurrency.code,
        initial_amount: initialAmount,
        theme: selectedTheme.id,
        ...account,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("budgets")
        .insert(dto)
        .select()
        .single();

      if (insertError) {
        Alert.alert(
          "Échec de la création",
          `${insertError.message}${insertError.hint ? `\n${insertError.hint}` : ""}`,
        );
        return;
      }

      addBudget(inserted);
      const currentCount = useBudgetStore.getState().budgets.length;
      if (currentCount === 1) setActiveBudget(inserted);

      router.back();
    } catch (err: any) {
      Alert.alert("Erreur inattendue", err?.message ?? "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = name.trim().length > 0 && !isSubmitting && canEdit;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Preview */}
          <View style={styles.previewWrap}>
            <PreviewCard
              name={name}
              currency={selectedCurrency}
              theme={selectedTheme}
              initialAmount={initialAmount}
              c={c}
            />
          </View>

          {/* Partage */}
          {existing && !canEdit && role && (
            <View style={[styles.shareHint, { backgroundColor: c.surfaceAlt }]}>
              <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} />
              <Text style={[styles.shareHintText, { color: c.text }]}>
                Seul le propriétaire de ce budget partagé peut le modifier.
              </Text>
            </View>
          )}
          {!existing && (
          <View style={[styles.shareHint, { backgroundColor: c.tintMuted }]}>
            <Ionicons name="people-outline" size={18} color={c.tint} />
            <Text style={[styles.shareHintText, { color: c.text }]}>
              Pour gérer ce budget à plusieurs, créez-le puis touchez « Partager le budget » dans le Profil.
            </Text>
          </View>
          )}

          {/* Name */}
          <SectionLabel label="NOM DU BUDGET" color={c.textSubtle} />
          <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="wallet-outline" size={18} color={c.textMuted} />
            <TextInput
              style={[styles.input, { color: c.text }]}
              placeholder="Ex: Budget vacances"
              placeholderTextColor={c.textSubtle}
              value={name}
              onChangeText={setName}
              maxLength={40}
              returnKeyType="next"
            />
            {name.length > 0 && (
              <Text style={[styles.charCount, { color: c.textSubtle }]}>{name.length}/40</Text>
            )}
          </View>

          {/* Où est l'argent */}
          <SectionLabel label="OÙ EST CET ARGENT ?" color={c.textSubtle} />
          <AccountPicker
            kind={accountKindValue}
            name={accountName}
            usedNames={usedAccountNames}
            onChange={(k, n) => {
              setAccountKindValue(k);
              setAccountName(n);
            }}
          />
          <Text style={[styles.inputHint, { color: c.textSubtle, marginTop: 2 }]}>
            MVola, compte bancaire, caisse d&apos;épargne… Une étiquette pour savoir où se trouve l&apos;argent.
          </Text>

          {/* Montant initial */}
          <SectionLabel label="MONTANT INITIAL" color={c.textSubtle} />
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: c.surface, borderColor: initialAmount > 0 ? c.tint : c.border },
            ]}
          >
            <View
              style={[
                styles.currencyTag,
                { backgroundColor: initialAmount > 0 ? c.tintMuted : c.surfaceAlt },
              ]}
            >
              <Text style={[styles.currencyTagText, { color: initialAmount > 0 ? c.tint : c.textMuted }]}>
                {selectedCurrency.symbol}
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.amountInput, { color: c.text }]}
              placeholder="0"
              placeholderTextColor={c.textSubtle}
              value={initialAmountRaw}
              onChangeText={setInitialAmountRaw}
              keyboardType="numeric"
              returnKeyType="next"
            />
            {initialAmount > 0 && (
              <Text style={[styles.amountFormatted, { color: c.tint }]}>{fmt(initialAmount)}</Text>
            )}
          </View>
          <Text style={[styles.inputHint, { color: c.textSubtle }]}>
            Le montant que vous mettez dans ce budget au départ
          </Text>

          {/* Description */}
          <SectionLabel label="DESCRIPTION (OPTIONNEL)" color={c.textSubtle} />
          <View
            style={[
              styles.inputWrap,
              styles.textAreaWrap,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <TextInput
              style={[styles.input, styles.textArea, { color: c.text }]}
              placeholder="Une courte description..."
              placeholderTextColor={c.textSubtle}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={120}
              textAlignVertical="top"
            />
          </View>

          {/* Currency (non modifiable ensuite : les montants ne sont pas convertis) */}
          <SectionLabel label="DEVISE" color={c.textSubtle} />
          {existing ? (
            <Text style={[styles.inputHint, { color: c.textSubtle }]}>
              {selectedCurrency.label} ({selectedCurrency.code}). La devise ne peut pas être changée : les montants
              enregistrés ne seraient pas convertis.
            </Text>
          ) : (
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((currency) => {
              const active = selectedCurrency.code === currency.code;
              return (
                <TouchableOpacity
                  key={currency.code}
                  onPress={() => setSelectedCurrency(currency)}
                  style={[
                    styles.currencyBtn,
                    { backgroundColor: active ? c.tint : c.surface, borderColor: active ? c.tint : c.border },
                  ]}
                >
                  <Text style={[styles.currencySymbol, { color: active ? "#fff" : c.textMuted }]}>
                    {currency.symbol}
                  </Text>
                  <Text style={[styles.currencyCode, { color: active ? "#fff" : c.text }]}>
                    {currency.code}
                  </Text>
                  <Text
                    style={[
                      styles.currencyLabel,
                      { color: active ? "rgba(255,255,255,0.75)" : c.textSubtle },
                    ]}
                    numberOfLines={1}
                  >
                    {currency.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}

          {/* Color theme — repère discret par budget, pas de fond dégradé */}
          <SectionLabel label="COULEUR DU BUDGET" color={c.textSubtle} />
          <View style={styles.themesRow}>
            {BUDGET_THEMES.map((theme) => {
              const active = selectedTheme.id === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  onPress={() => setSelectedTheme(theme)}
                  style={[
                    styles.themeBtn,
                    { backgroundColor: c.surface, borderColor: active ? theme.to : c.border },
                    active && { borderWidth: 2 },
                  ]}
                >
                  <View style={[styles.themeSwatch, { backgroundColor: theme.to }]}>
                    {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.themeLabel, { color: c.text }]}>{theme.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {canDelete && (
            <View style={[styles.dangerZone, { borderColor: c.danger + "40" }]}>
              <Text style={[styles.dangerTitle, { color: c.danger }]}>Zone sensible</Text>
              <Text style={[styles.inputHint, { color: c.textMuted, marginTop: 0 }]}>
                Supprime le budget et tout son contenu
                {existing?.owner_type === "group" ? ", pour tous les membres" : ""}.
              </Text>
              <Button
                label="Supprimer ce budget"
                variant="destructive"
                onPress={handleDelete}
                icon={<Ionicons name="trash-outline" size={18} color={c.danger} />}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit */}
      <View
        style={[
          styles.footer,
          { paddingBottom: bottom + 16, backgroundColor: c.bg, borderTopColor: c.border },
        ]}
      >
        <Button
          label={existing ? "Enregistrer" : "Créer le budget"}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          icon={<Ionicons name={existing ? "checkmark-circle-outline" : "add-circle-outline"} size={20} color="#fff" />}
          style={Shadow.md}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  shareHint: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: Radius.md, marginBottom: 8 },
  shareHintText: { flex: 1, fontSize: 13, lineHeight: 19 },
  dangerZone: { marginTop: 24, gap: 10, padding: 14, borderRadius: Radius.lg, borderWidth: 1 },
  dangerTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 8,
  },
  previewWrap: { marginBottom: 8 },

  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  typeBtnText: { fontSize: 14, fontWeight: "600" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textAreaWrap: { alignItems: "flex-start", paddingTop: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: "500" },
  textArea: { minHeight: 70, paddingTop: 0 },
  charCount: { fontSize: 11, fontWeight: "500" },
  inputHint: { fontSize: 11, marginTop: -4, marginLeft: 4 },

  amountInput: { fontSize: 20, fontWeight: "700" },
  amountFormatted: { fontSize: 12, fontWeight: "600" },
  currencyTag: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  currencyTagText: { fontSize: 16, fontWeight: "800" },

  currencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  currencyBtn: {
    width: "47%",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 13,
    gap: 2,
  },
  currencySymbol: { fontSize: 20, fontWeight: "800" },
  currencyCode: { fontSize: 14, fontWeight: "700" },
  currencyLabel: { fontSize: 11, marginTop: 1 },

  themesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeBtn: {
    width: "30%",
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  themeSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  themeLabel: { fontSize: 10, fontWeight: "700" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
