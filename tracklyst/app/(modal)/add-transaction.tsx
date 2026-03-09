import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { useBudgets } from "@/src/features/budgets/hooks/useBudgets";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import type { Budget } from "@/src/features/budgets/types/budget.types";
import { useCategories } from "@/src/features/categories/hooks/useCategories";
import { useAddTransaction } from "@/src/features/transaction/hooks/useAddTransaction";
import { formatCurrency } from "@/src/utils/currency";
import { todayISO } from "@/src/utils/date";
import { Stack, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType = "expense" | "income";

const CATEGORY_ICONS: Record<string, string> = {
  Salaire: "briefcase.fill",
  "Autre revenu": "plus.circle.fill",
  Loyer: "house.fill",
  Courses: "cart.fill",
  Transport: "car.fill",
  Abonnements: "bell.fill",
  Loisirs: "gamecontroller.fill",
  Restaurant: "fork.knife",
  Santé: "heart.fill",
  "Autre dépense": "ellipsis.circle.fill",
};

const CATEGORY_COLORS: Record<string, string> = {
  Salaire: "#10B981",
  "Autre revenu": "#34D399",
  Loyer: "#6366F1",
  Courses: "#F59E0B",
  Transport: "#3B82F6",
  Abonnements: "#8B5CF6",
  Loisirs: "#EC4899",
  Restaurant: "#F97316",
  Santé: "#06B6D4",
  "Autre dépense": "#6B7280",
};

// ─── Numpad ───────────────────────────────────────────────────────────────────
const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

function Numpad({
  value,
  onChange,
  isDark,
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  const handleKey = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1) || "0");
      return;
    }
    if (key === "." && value.includes(".")) return;
    const dotIdx = value.indexOf(".");
    if (dotIdx !== -1 && value.length - dotIdx > 2) return;
    if (value.replace(".", "").length >= 10) return;
    if (value === "0" && key !== ".") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <View style={styles.numpad}>
      {PAD_KEYS.map((key) => (
        <Pressable
          key={key}
          onPress={() => handleKey(key)}
          style={({ pressed }) => [
            styles.numKey,
            isDark && styles.numKeyDark,
            key === "⌫" && styles.numKeyDelete,
            key === "⌫" && isDark && styles.numKeyDeleteDark,
            pressed && styles.numKeyPressed,
          ]}
        >
          {key === "⌫" ? (
            <IconSymbol
              name="delete.backward.fill"
              size={18}
              color={isDark ? "#F87171" : "#EF4444"}
            />
          ) : (
            <Text style={[styles.numKeyText, isDark && styles.numKeyTextDark]}>
              {key}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// ─── Budget Selector ──────────────────────────────────────────────────────────
function BudgetSelector({
  budgets,
  selectedId,
  onSelect,
  isDark,
  accentColor,
}: {
  budgets: Budget[];
  selectedId: string | null;
  onSelect: (b: Budget) => void;
  isDark: boolean;
  accentColor: string;
}) {
  if (budgets.length === 0) return null;
  if (budgets.length === 1) return null; // auto-sélectionné, pas besoin d'afficher

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
        Budget
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {budgets.map((b) => {
          const isSelected = selectedId === b.id;
          return (
            <Pressable
              key={b.id}
              onPress={() => onSelect(b)}
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
                color={isSelected ? "#fff" : isDark ? "#94A3B8" : "#64748B"}
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
              {isSelected && (
                <IconSymbol name="checkmark" size={11} color="#fff" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AddTransaction() {
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const { addTransaction, isLoading, error } = useAddTransaction();
  const { budgets } = useBudgets();
  const { activeBudget, setActiveBudget } = useBudgetStore();

  // ── Budget local selection (peut différer de l'actif global) ──────────────
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(
    activeBudget ?? budgets[0] ?? null,
  );

  // Sync si activeBudget change après le mount
  useEffect(() => {
    if (!selectedBudget && activeBudget) setSelectedBudget(activeBudget);
  }, [activeBudget]);

  // Auto-select premier budget si pas encore sélectionné
  useEffect(() => {
    if (!selectedBudget && budgets.length > 0) setSelectedBudget(budgets[0]);
  }, [budgets]);

  // ── Catégories liées au budget sélectionné ─────────────────────────────────
  const { categories, isLoading: catsLoading } = useCategories(
    selectedBudget?.id,
  );

  const [type, setType] = useState<TxType>("expense");
  const [amountRaw, setAmountRaw] = useState("0");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [date] = useState(todayISO());

  const accentColor = type === "income" ? "#10B981" : "#EF4444";
  const accentLight = type === "income" ? "#ECFDF5" : "#FEF2F2";
  const accentLightDark = type === "income" ? "#064E3B" : "#450A0A";

  const filteredCats = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  const amount = parseFloat(amountRaw) || 0;
  const canSubmit =
    amount > 0 && !!categoryId && !!selectedBudget && !isLoading;

  const handleTypeChange = (v: TxType) => {
    setType(v);
    setCategoryId(null);
    setAmountRaw("0");
  };

  const handleBudgetSelect = (b: Budget) => {
    setSelectedBudget(b);
    setCategoryId(null); // reset catégorie car elle dépend du budget
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !categoryId || !selectedBudget) return;
    try {
      await addTransaction({
        type,
        amount,
        category_id: categoryId,
        description: description.trim() || undefined,
        date,
        budget_id: selectedBudget.id,
      });
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message ?? "Impossible d'enregistrer la transaction.",
        [{ text: "OK" }],
      );
    }
  }, [canSubmit, type, amount, categoryId, description, date, selectedBudget]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Nouvelle transaction",
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
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 1. Type toggle ── */}
          <View style={[styles.typeToggle, isDark && styles.typeToggleDark]}>
            {(["expense", "income"] as TxType[]).map((t) => {
              const isActive = type === t;
              const color = t === "income" ? "#10B981" : "#EF4444";
              const icon =
                t === "income"
                  ? "arrow.down.circle.fill"
                  : "arrow.up.circle.fill";
              const label = t === "income" ? "Revenu" : "Dépense";
              return (
                <Pressable
                  key={t}
                  onPress={() => handleTypeChange(t)}
                  style={[
                    styles.typeBtn,
                    isActive && { backgroundColor: color },
                  ]}
                >
                  <IconSymbol
                    name={icon as any}
                    size={17}
                    color={isActive ? "#fff" : "#94A3B8"}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      isActive && styles.typeBtnTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── 2. Montant + numpad ── */}
          <View
            style={[
              styles.amountBlock,
              isDark && styles.amountBlockDark,
              { borderColor: accentColor + "40" },
            ]}
          >
            <View style={styles.amountRow}>
              <Text style={[styles.amountUnit, { color: accentColor }]}>
                Ar
              </Text>
              <Text style={[styles.amountText, { color: accentColor }]}>
                {amountRaw === "0" || amountRaw === ""
                  ? "0"
                  : formatCurrency(amount).replace(/[\u202F\s]?Ar$/, "")}
              </Text>
              {amountRaw !== "0" && amountRaw !== "" && (
                <Pressable
                  onPress={() => setAmountRaw("0")}
                  style={styles.amountClearBtn}
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={18}
                    color="#94A3B8"
                  />
                </Pressable>
              )}
            </View>
            <Numpad value={amountRaw} onChange={setAmountRaw} isDark={isDark} />
          </View>

          {/* ── 3. Sélection du budget ── */}
          <BudgetSelector
            budgets={budgets}
            selectedId={selectedBudget?.id ?? null}
            onSelect={handleBudgetSelect}
            isDark={isDark}
            accentColor={accentColor}
          />

          {/* Budget actif affiché (si un seul budget) */}
          {budgets.length === 1 && selectedBudget && (
            <View
              style={[
                styles.singleBudgetRow,
                isDark && styles.singleBudgetRowDark,
              ]}
            >
              <IconSymbol
                name="wallet.pass.fill"
                size={14}
                color={accentColor}
              />
              <Text
                style={[styles.singleBudgetText, isDark && styles.textLight]}
              >
                Budget :{" "}
                <Text style={{ fontWeight: "700", color: accentColor }}>
                  {selectedBudget.name}
                </Text>
              </Text>
            </View>
          )}

          {/* ── 4. Catégorie ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
                Catégorie
              </Text>
              {!categoryId && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Requis</Text>
                </View>
              )}
            </View>

            {/* Loading catégories */}
            {catsLoading ? (
              <View style={styles.catsLoading}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                  Chargement…
                </Text>
              </View>
            ) : filteredCats.length === 0 ? (
              <View style={styles.catsEmpty}>
                <IconSymbol name="tray.fill" size={24} color="#94A3B8" />
                <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                  {!selectedBudget
                    ? "Sélectionnez d'abord un budget"
                    : categories.length === 0
                      ? "Aucune catégorie trouvée pour ce budget"
                      : `Aucune catégorie de type "${type === "income" ? "revenu" : "dépense"}"`}
                </Text>
              </View>
            ) : (
              <View style={styles.catGrid}>
                {filteredCats.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  const color = CATEGORY_COLORS[cat.name] ?? "#6B7280";
                  const icon = (CATEGORY_ICONS[cat.name] ??
                    "creditcard.fill") as any;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      style={[
                        styles.catItem,
                        isDark && styles.catItemDark,
                        isSelected && {
                          backgroundColor: isDark
                            ? accentLightDark
                            : accentLight,
                          borderColor: color,
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.catIconWrap,
                          {
                            backgroundColor: isSelected ? color : color + "20",
                          },
                        ]}
                      >
                        <IconSymbol
                          name={icon}
                          size={20}
                          color={isSelected ? "#fff" : color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.catLabel,
                          isDark && styles.textLight,
                          isSelected && { color, fontWeight: "700" },
                        ]}
                        numberOfLines={2}
                      >
                        {cat.name}
                      </Text>
                      {isSelected && (
                        <View
                          style={[styles.catCheck, { backgroundColor: color }]}
                        >
                          <IconSymbol name="checkmark" size={8} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── 5. Description ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
              Description<Text style={styles.optionalTag}> · optionnel</Text>
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Ex : Courses au marché, loyer mars…"
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              maxLength={120}
              returnKeyType="done"
            />
          </View>

          {/* ── 6. Date ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
              Date
            </Text>
            <View style={[styles.dateRow, isDark && styles.dateRowDark]}>
              <IconSymbol name="calendar" size={16} color={accentColor} />
              <Text style={[styles.dateText, isDark && styles.textLight]}>
                {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          {/* ── Erreur ── */}
          {error && (
            <View style={styles.errorBox}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={14}
                color="#B45309"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Submit ── */}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: canSubmit ? accentColor : "#CBD5E1" },
              pressed &&
                canSubmit && { opacity: 0.85, transform: [{ scale: 0.98 }] },
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
                <Text style={styles.submitBtnText}>
                  Enregistrer{amount > 0 ? ` · ${formatCurrency(amount)}` : ""}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  rootDark: { backgroundColor: "#0F172A" },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 20 },

  typeToggle: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  typeToggleDark: { backgroundColor: "#1E293B" },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 13,
    gap: 7,
  },
  typeBtnText: { fontSize: 15, fontWeight: "600", color: "#94A3B8" },
  typeBtnTextActive: { color: "#fff" },

  amountBlock: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  amountBlockDark: { backgroundColor: "#1E293B", borderColor: "#334155" },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 64,
  },
  amountUnit: { fontSize: 22, fontWeight: "700", marginTop: 12 },
  amountText: {
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -2,
    minWidth: 80,
    textAlign: "center",
  },
  amountClearBtn: { position: "absolute", right: 0, top: 0 },

  numpad: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  numKey: {
    width: "30%",
    aspectRatio: 2.4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  numKeyDark: { backgroundColor: "#0F172A" },
  numKeyDelete: { backgroundColor: "#FEF2F2" },
  numKeyDeleteDark: { backgroundColor: "#450A0A" },
  numKeyPressed: { opacity: 0.5, transform: [{ scale: 0.94 }] },
  numKeyText: { fontSize: 22, fontWeight: "500", color: "#0F172A" },
  numKeyTextDark: { color: "#F8FAFC" },

  // Budget selector
  budgetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  budgetChipDark: { backgroundColor: "#1E293B", borderColor: "#334155" },
  budgetChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  singleBudgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  singleBudgetRowDark: { backgroundColor: "#1E293B", borderColor: "#334155" },
  singleBudgetText: { fontSize: 13, color: "#475569" },

  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.2,
  },
  optionalTag: { fontSize: 12, fontWeight: "400", color: "#94A3B8" },
  requiredBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.3,
  },

  catsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  catsEmpty: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center" },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catItem: {
    width: "22%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 6,
    position: "relative",
  },
  catItemDark: { backgroundColor: "#1E293B" },
  catIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  catCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputDark: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    color: "#F8FAFC",
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateRowDark: { backgroundColor: "#1E293B", borderColor: "#334155" },
  dateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    textTransform: "capitalize",
    flex: 1,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 13, color: "#92400E", flex: 1 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    borderRadius: 16,
    gap: 8,
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },

  textLight: { color: "#F8FAFC" },
  textMuted: { color: "#94A3B8" },
});
