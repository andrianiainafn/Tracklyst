import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { supabase } from "@/src/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
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

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = {
  light: {
    bg: "#F0F4F8",
    card: "#FFFFFF",
    text: "#0D1B2A",
    sub: "#5C7080",
    border: "#E2EAF0",
    input: "#F8FAFC",
  },
  dark: {
    bg: "#0A0F1E",
    card: "#131929",
    text: "#E8EFF8",
    sub: "#7A92AA",
    border: "#1E2D40",
    input: "#0D1525",
  },
};

const BUDGET_THEMES = [
  {
    id: "emerald",
    from: "#0D4F3C",
    to: "#10B981",
    accent: "#34D399",
    label: "Émeraude",
  },
  {
    id: "indigo",
    from: "#1E1B4B",
    to: "#6366F1",
    accent: "#A5B4FC",
    label: "Indigo",
  },
  {
    id: "orange",
    from: "#7C2D12",
    to: "#F97316",
    accent: "#FED7AA",
    label: "Orange",
  },
  {
    id: "cyan",
    from: "#164E63",
    to: "#0EA5E9",
    accent: "#BAE6FD",
    label: "Cyan",
  },
  {
    id: "rose",
    from: "#4C0519",
    to: "#F43F5E",
    accent: "#FECDD3",
    label: "Rose",
  },
  {
    id: "violet",
    from: "#2E1065",
    to: "#8B5CF6",
    accent: "#DDD6FE",
    label: "Violet",
  },
];

const CURRENCIES = [
  { code: "MGA", symbol: "Ar", label: "Ariary malgache" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dollar américain" },
];

const BUDGET_TYPES = [
  { id: "user", label: "Personnel", icon: "person-outline" as const },
  { id: "group", label: "Groupe", icon: "people-outline" as const },
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
}: {
  name: string;
  currency: (typeof CURRENCIES)[0];
  theme: (typeof BUDGET_THEMES)[0];
  initialAmount: number;
}) {
  return (
    <View style={[previewStyles.card, { backgroundColor: theme.from }]}>
      <View
        style={[previewStyles.circle1, { backgroundColor: theme.to + "30" }]}
      />
      <View
        style={[previewStyles.circle2, { backgroundColor: theme.to + "20" }]}
      />

      <View style={previewStyles.header}>
        <View style={previewStyles.titleRow}>
          <View
            style={[previewStyles.dot, { backgroundColor: theme.accent }]}
          />
          <Text style={previewStyles.name} numberOfLines={1}>
            {name || "Nom du budget"}
          </Text>
        </View>
        <View
          style={[previewStyles.badge, { backgroundColor: theme.to + "40" }]}
        >
          <Text style={[previewStyles.badgeText, { color: theme.accent }]}>
            {currency.code}
          </Text>
        </View>
      </View>

      <Text style={previewStyles.balanceLabel}>SOLDE DISPONIBLE</Text>
      <Text style={previewStyles.balance}>
        {initialAmount > 0 ? fmt(initialAmount) : "0"}
        <Text style={previewStyles.balanceCurrency}> {currency.symbol}</Text>
      </Text>

      <View style={previewStyles.statsRow}>
        <View style={previewStyles.statItem}>
          <Text style={[previewStyles.statVal, { color: theme.accent }]}>
            +{initialAmount > 0 ? fmt(initialAmount) : "0"}
          </Text>
          <Text style={previewStyles.statLbl}>Initial</Text>
        </View>
        <View style={previewStyles.statDivider} />
        <View style={previewStyles.statItem}>
          <Text style={previewStyles.statVal}>-0</Text>
          <Text style={previewStyles.statLbl}>Dépenses</Text>
        </View>
        <View style={previewStyles.statDivider} />
        <View style={previewStyles.statItem}>
          <Text style={previewStyles.statVal}>0</Text>
          <Text style={previewStyles.statLbl}>Objectifs</Text>
        </View>
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  circle1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -30,
    top: -40,
  },
  circle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    right: 40,
    bottom: -20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  name: { fontSize: 13, fontWeight: "700", color: "#fff", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  balanceLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  balance: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
    marginTop: 2,
    marginBottom: 12,
  },
  balanceCurrency: { fontSize: 14, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    padding: 10,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  statVal: { fontSize: 11, fontWeight: "700", color: "#fff" },
  statLbl: { fontSize: 9, color: "rgba(255,255,255,0.5)" },
});

function SectionLabel({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{label}</Text>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AddBudgetScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const { bottom } = useSafeAreaInsets();
  const p = isDark ? PALETTE.dark : PALETTE.light;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initialAmountRaw, setInitialAmountRaw] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(BUDGET_THEMES[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [budgetType, setBudgetType] = useState<"user" | "group">("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addBudget, setActiveBudget } = useBudgetStore();
  const submitAnim = useRef(new Animated.Value(1)).current;

  const initialAmount = parseAmount(initialAmountRaw);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    Animated.sequence([
      Animated.timing(submitAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(submitAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

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
        owner_type: budgetType,
        owner_id: user.id,
        currency: selectedCurrency.code,
        initial_amount: initialAmount,
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

      // ✅ Push to store + auto-select
      addBudget(inserted);
      const currentCount = useBudgetStore.getState().budgets.length;
      if (currentCount === 1) setActiveBudget(inserted);

      router.back();
    } catch (err: any) {
      Alert.alert(
        "Erreur inattendue",
        err?.message ?? "Une erreur est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  return (
    <View style={[styles.root, { backgroundColor: p.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: p.card, borderBottomColor: p.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          hitSlop={8}
        >
          <Ionicons name="close" size={22} color={p.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: p.text }]}>
          Nouveau budget
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottom + 120 },
          ]}
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
            />
          </View>

          {/* Type */}
          <SectionLabel label="TYPE DE BUDGET" color={p.sub} />
          <View style={styles.typeRow}>
            {BUDGET_TYPES.map((type) => {
              const active = budgetType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setBudgetType(type.id as "user" | "group")}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: active ? selectedTheme.from : p.card,
                      borderColor: active ? selectedTheme.to : p.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={active ? selectedTheme.accent : p.sub}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: active ? "#fff" : p.text },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Name */}
          <SectionLabel label="NOM DU BUDGET" color={p.sub} />
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: p.input, borderColor: p.border },
            ]}
          >
            <Ionicons name="wallet-outline" size={18} color={p.sub} />
            <TextInput
              style={[styles.input, { color: p.text }]}
              placeholder="Ex: Budget vacances"
              placeholderTextColor={p.sub}
              value={name}
              onChangeText={setName}
              maxLength={40}
              returnKeyType="next"
            />
            {name.length > 0 && (
              <Text style={[styles.charCount, { color: p.sub }]}>
                {name.length}/40
              </Text>
            )}
          </View>

          {/* ── Montant initial ── */}
          <SectionLabel label="MONTANT INITIAL" color={p.sub} />
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: p.input,
                borderColor: initialAmount > 0 ? selectedTheme.to : p.border,
              },
            ]}
          >
            <View
              style={[
                styles.currencyTag,
                {
                  backgroundColor:
                    initialAmount > 0 ? selectedTheme.from : p.border + "80",
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyTagText,
                  { color: initialAmount > 0 ? selectedTheme.accent : p.sub },
                ]}
              >
                {selectedCurrency.symbol}
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.amountInput, { color: p.text }]}
              placeholder="0"
              placeholderTextColor={p.sub}
              value={initialAmountRaw}
              onChangeText={setInitialAmountRaw}
              keyboardType="numeric"
              returnKeyType="next"
            />
            {initialAmount > 0 && (
              <Text
                style={[styles.amountFormatted, { color: selectedTheme.to }]}
              >
                {fmt(initialAmount)}
              </Text>
            )}
          </View>
          <Text style={[styles.inputHint, { color: p.sub }]}>
            Le montant que vous mettez dans ce budget au départ
          </Text>

          {/* Description */}
          <SectionLabel label="DESCRIPTION (OPTIONNEL)" color={p.sub} />
          <View
            style={[
              styles.inputWrap,
              styles.textAreaWrap,
              { backgroundColor: p.input, borderColor: p.border },
            ]}
          >
            <TextInput
              style={[styles.input, styles.textArea, { color: p.text }]}
              placeholder="Une courte description..."
              placeholderTextColor={p.sub}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={120}
              textAlignVertical="top"
            />
          </View>

          {/* Currency */}
          <SectionLabel label="DEVISE" color={p.sub} />
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((currency) => {
              const active = selectedCurrency.code === currency.code;
              return (
                <TouchableOpacity
                  key={currency.code}
                  onPress={() => setSelectedCurrency(currency)}
                  style={[
                    styles.currencyBtn,
                    {
                      backgroundColor: active ? selectedTheme.from : p.card,
                      borderColor: active ? selectedTheme.to : p.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: active ? selectedTheme.accent : p.sub },
                    ]}
                  >
                    {currency.symbol}
                  </Text>
                  <Text
                    style={[
                      styles.currencyCode,
                      { color: active ? "#fff" : p.text },
                    ]}
                  >
                    {currency.code}
                  </Text>
                  <Text
                    style={[
                      styles.currencyLabel,
                      { color: active ? "rgba(255,255,255,0.6)" : p.sub },
                    ]}
                    numberOfLines={1}
                  >
                    {currency.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color theme */}
          <SectionLabel label="COULEUR DU BUDGET" color={p.sub} />
          <View style={styles.themesRow}>
            {BUDGET_THEMES.map((theme) => {
              const active = selectedTheme.id === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  onPress={() => setSelectedTheme(theme)}
                  style={[
                    styles.themeBtn,
                    { backgroundColor: theme.from },
                    active && styles.themeBtnSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.themeInner,
                      { backgroundColor: theme.to + "60" },
                    ]}
                  />
                  {active && (
                    <View style={styles.themeCheck}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.themeLabel}>{theme.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottom + 16,
            backgroundColor: p.bg,
            borderTopColor: p.border,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: submitAnim }] }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? selectedTheme.from : p.card,
                borderColor: canSubmit ? selectedTheme.to : p.border,
                opacity: canSubmit ? 1 : 0.55,
              },
            ]}
          >
            <View
              style={[
                styles.submitBtnGlow,
                { backgroundColor: selectedTheme.to + "30" },
              ]}
            />
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color={selectedTheme.accent} />
                <Text style={[styles.submitBtnText, { color: "#fff" }]}>
                  Création...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={canSubmit ? selectedTheme.accent : p.sub}
                />
                <Text
                  style={[
                    styles.submitBtnText,
                    { color: canSubmit ? "#fff" : p.sub },
                  ]}
                >
                  Créer le budget
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 8,
  },
  previewWrap: { marginBottom: 8 },

  // Type
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  typeBtnText: { fontSize: 14, fontWeight: "600" },

  // Inputs
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textAreaWrap: { alignItems: "flex-start", paddingTop: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: "500" },
  textArea: { minHeight: 70, paddingTop: 0 },
  charCount: { fontSize: 11, fontWeight: "500" },
  inputHint: { fontSize: 11, marginTop: -4, marginLeft: 4 },

  // Amount input
  amountInput: { fontSize: 20, fontWeight: "700" },
  amountFormatted: { fontSize: 12, fontWeight: "600" },
  currencyTag: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyTagText: { fontSize: 16, fontWeight: "800" },

  // Currency
  currencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  currencyBtn: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 13,
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  currencySymbol: { fontSize: 20, fontWeight: "800" },
  currencyCode: { fontSize: 14, fontWeight: "700" },
  currencyLabel: { fontSize: 11, marginTop: 1 },

  // Themes
  themesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeBtn: {
    width: "30%",
    aspectRatio: 1.4,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
  themeBtnSelected: { borderWidth: 2.5, borderColor: "#fff" },
  themeInner: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    top: -10,
    right: -10,
  },
  themeCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  themeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  submitBtnGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    borderRadius: 18,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
});
