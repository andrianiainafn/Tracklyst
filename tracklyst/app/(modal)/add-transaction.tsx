import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Input } from "@/src/components/ui/Input";
import { useBudgets } from "@/src/features/budgets/hooks/useBudgets";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { categoryService } from "@/src/features/categories/services/categoryService";
import { useCategoryStore } from "@/src/features/categories/store/categoryStore";
import type { BudgetBalance } from "@/src/features/budgets/types/budget.types";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import type { Budget } from "@/src/features/budgets/types/budget.types";
import { useCategories } from "@/src/features/categories/hooks/useCategories";
import { useAddTransaction } from "@/src/features/transaction/hooks/useAddTransaction";
import { useUpdateTransaction } from "@/src/features/transaction/hooks/useUpdateTransaction";
import { formatAmount, formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { todayISO } from "@/src/utils/date";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from '@expo/vector-icons/Ionicons';

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType = "expense" | "income";

// ─── Numpad ───────────────────────────────────────────────────────────────────
const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

function Numpad({
  value,
  onChange,
  c,
}: {
  value: string;
  onChange: (v: string) => void;
  c: typeof Colors.light;
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
            { backgroundColor: c.bg },
            key === "⌫" && { backgroundColor: c.dangerMuted },
            pressed && styles.numKeyPressed,
          ]}
        >
          {key === "⌫" ? (
            <Ionicons name="close-sharp" size={18} color={c.danger} />
          ) : (
            <Text style={[styles.numKeyText, { color: c.text }]}>{key}</Text>
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
  c,
  accentColor,
}: {
  budgets: Budget[];
  selectedId: string | null;
  onSelect: (b: Budget) => void;
  c: typeof Colors.light;
  accentColor: string;
}) {
  if (budgets.length === 0) return null;
  if (budgets.length === 1) return null; // auto-sélectionné, pas besoin d'afficher

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Budget</Text>
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
                { backgroundColor: c.surface, borderColor: c.border },
                isSelected && { backgroundColor: accentColor, borderColor: accentColor },
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
              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
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
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{
    id?: string;
    type?: TxType;
    amount?: string;
    category_id?: string;
    description?: string;
    date?: string;
    budget_id?: string;
  }>();
  const isEditing = !!params.id;

  const { addTransaction, isLoading: isAdding, error: addError } =
    useAddTransaction();
  const {
    updateTransaction,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdateTransaction();
  const isLoading = isEditing ? isUpdating : isAdding;
  const error = isEditing ? updateError : addError;
  const { budgets } = useBudgets();
  const { activeBudget } = useBudgetStore();

  // ── Budget local selection (peut différer de l'actif global) ──────────────
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(
    (params.budget_id && budgets.find((b) => b.id === params.budget_id)) ||
      activeBudget ||
      budgets[0] ||
      null,
  );

  useEffect(() => {
    if (!isEditing && !selectedBudget && activeBudget)
      setSelectedBudget(activeBudget);
  }, [activeBudget]);

  useEffect(() => {
    if (!isEditing && !selectedBudget && budgets.length > 0)
      setSelectedBudget(budgets[0]);
  }, [budgets]);

  // ── Catégories liées au budget sélectionné ─────────────────────────────────
  const { categories, isLoading: catsLoading } = useCategories(
    selectedBudget?.id,
  );

  const [type, setType] = useState<TxType>(params.type ?? "expense");
  const [amountRaw, setAmountRaw] = useState(params.amount ?? "0");
  const [categoryId, setCategoryId] = useState<string | null>(
    params.category_id ?? null,
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState(params.description ?? "");
  const [date] = useState(params.date ?? todayISO());
  const [selectedBalance, setSelectedBalance] = useState<BudgetBalance | null>(
    null,
  );
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const originalAmount = isEditing ? parseFloat(params.amount ?? "0") || 0 : 0;
  const originalType = params.type;

  const accentColor = type === "income" ? c.tint : c.danger;
  const accentLight = type === "income" ? c.tintMuted : c.dangerMuted;

  const filteredCats = useMemo(
    () => categories.filter((cat) => cat.type === type),
    [categories, type],
  );

  const amount = parseFloat(amountRaw) || 0;
  const balanceAdjustment =
    isEditing && originalType === "expense" ? originalAmount : 0;
  const effectiveAvailable =
    selectedBalance != null
      ? selectedBalance.available_balance + balanceAdjustment
      : null;
  const exceedsBalance =
    type === "expense" && effectiveAvailable != null && amount > effectiveAvailable;

  const canSubmit =
    amount > 0 &&
    !!categoryId &&
    !!selectedBudget &&
    !isLoading &&
    !isBalanceLoading &&
    !exceedsBalance;

  const { addCategory } = useCategoryStore();

  const handleTypeChange = (v: TxType) => {
    setType(v);
    setCategoryId(null);
    setAmountRaw("0");
  };

  const handleBudgetSelect = (b: Budget) => {
    setSelectedBudget(b);
    setCategoryId(null);
  };

  useEffect(() => {
    const loadBalance = async () => {
      if (!selectedBudget) {
        setSelectedBalance(null);
        return;
      }
      try {
        setIsBalanceLoading(true);
        const balance = await budgetService.getBalance(selectedBudget.id);
        setSelectedBalance(balance);
      } catch {
        setSelectedBalance(null);
      } finally {
        setIsBalanceLoading(false);
      }
    };

    loadBalance();
  }, [selectedBudget?.id]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !categoryId || !selectedBudget) return;

    if (
      type === "expense" &&
      effectiveAvailable != null &&
      amount > effectiveAvailable
    ) {
      Alert.alert(
        "Solde insuffisant",
        "Le montant de cette dépense dépasse le solde disponible du budget.",
        [{ text: "OK" }],
      );
      return;
    }
    try {
      if (isEditing && params.id) {
        await updateTransaction(params.id, {
          type,
          amount,
          category_id: categoryId,
          description: description.trim() || undefined,
          date,
        });
      } else {
        await addTransaction({
          type,
          amount,
          category_id: categoryId,
          description: description.trim() || undefined,
          date,
          budget_id: selectedBudget.id,
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message ?? "Impossible d'enregistrer la transaction.",
        [{ text: "OK" }],
      );
    }
  }, [
    canSubmit,
    isEditing,
    params.id,
    type,
    amount,
    categoryId,
    description,
    date,
    selectedBudget,
    effectiveAvailable,
  ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? "Modifier la transaction" : "Nouvelle transaction",
        }}
      />

      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: c.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 1. Type toggle ── */}
          <View style={[styles.typeToggle, { backgroundColor: c.surfaceAlt }]}>
            {(["expense", "income"] as TxType[]).map((t) => {
              const isActive = type === t;
              const color = t === "income" ? c.tint : c.danger;
              const icon =
                t === "income" ? "arrow.down.circle.fill" : "arrow.up.circle.fill";
              const label = t === "income" ? "Revenu" : "Dépense";
              return (
                <Pressable
                  key={t}
                  onPress={() => handleTypeChange(t)}
                  style={[styles.typeBtn, isActive && { backgroundColor: color }]}
                >
                  <IconSymbol name={icon as any} size={17} color={isActive ? "#fff" : c.textSubtle} />
                  <Text style={[styles.typeBtnText, { color: isActive ? "#fff" : c.textSubtle }]}>
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
              { backgroundColor: c.surface, borderColor: accentColor + "40" },
            ]}
          >
            <View style={styles.amountRow}>
              <Text style={[styles.amountUnit, { color: accentColor }]}>
                {getCurrencySymbol(selectedBudget?.currency)}
              </Text>
              <Text style={[styles.amountText, { color: accentColor }]}>
                {amountRaw === "0" || amountRaw === "" ? "0" : formatAmount(amount)}
              </Text>
              {amountRaw !== "0" && amountRaw !== "" && (
                <Pressable onPress={() => setAmountRaw("0")} style={styles.amountClearBtn}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={c.textSubtle} />
                </Pressable>
              )}
            </View>
            <Numpad value={amountRaw} onChange={setAmountRaw} c={c} />
          </View>

          {/* ── 3. Sélection du budget (verrouillée en édition) ── */}
          {!isEditing && (
            <BudgetSelector
              budgets={budgets}
              selectedId={selectedBudget?.id ?? null}
              onSelect={handleBudgetSelect}
              c={c}
              accentColor={accentColor}
            />
          )}

          {budgets.length === 1 && selectedBudget && (
            <View style={[styles.singleBudgetRow, { backgroundColor: c.surface, borderColor: c.border }]}>
              <IconSymbol name="wallet.pass.fill" size={14} color={accentColor} />
              <Text style={[styles.singleBudgetText, { color: c.text }]}>
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
              <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Catégorie</Text>
              {!categoryId && (
                <View style={[styles.requiredBadge, { backgroundColor: isDark ? "#451A03" : "#FEF3C7" }]}>
                  <Text style={[styles.requiredText, { color: isDark ? "#F59E0B" : "#B45309" }]}>
                    Requis
                  </Text>
                </View>
              )}
            </View>

            {catsLoading ? (
              <View style={styles.catsLoading}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={[styles.emptyText, { color: c.textSubtle }]}>Chargement…</Text>
              </View>
            ) : filteredCats.length === 0 ? (
              <View style={styles.catsEmpty}>
                <Ionicons name="file-tray-outline" size={24} color={c.textSubtle} />
                <Text style={[styles.emptyText, { color: c.textSubtle }]}>
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
                  const color = cat.color ?? "#6B7280";
                  const icon = cat.icon ?? "💳";
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      style={[
                        styles.catItem,
                        { backgroundColor: c.surface, borderColor: "transparent" },
                        isSelected && { backgroundColor: accentLight, borderColor: color, borderWidth: 1.5 },
                      ]}
                    >
                      <View
                        style={[
                          styles.catIconWrap,
                          { backgroundColor: isSelected ? color : color + "20" },
                        ]}
                      >
                        <Text style={styles.catIconEmoji}>{icon}</Text>
                      </View>
                      <Text
                        style={[
                          styles.catLabel,
                          { color: c.textMuted },
                          isSelected && { color, fontWeight: "700" },
                        ]}
                        numberOfLines={2}
                      >
                        {cat.name}
                      </Text>
                      {isSelected && (
                        <View style={[styles.catCheck, { backgroundColor: color }]}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selectedBudget && (
              <View style={styles.newCatRow}>
                <Input
                  containerStyle={{ flex: 1 }}
                  placeholder={
                    type === "income" ? "Nouvelle catégorie de revenu" : "Nouvelle catégorie de dépense"
                  }
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <Pressable
                  onPress={async () => {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    try {
                      const created = await categoryService.createCategory({
                        budget_id: selectedBudget.id,
                        name,
                        type,
                        icon: type === "income" ? "💵" : "💸",
                        color: "#6B7280",
                      });
                      addCategory(created);
                      setNewCategoryName("");
                      setCategoryId(created.id);
                    } catch (e: any) {
                      Alert.alert("Erreur", e?.message ?? "Impossible de créer la catégorie.");
                    }
                  }}
                  disabled={!newCategoryName.trim()}
                  style={({ pressed }) => [
                    styles.newCatBtn,
                    { backgroundColor: newCategoryName.trim() ? accentColor : c.border },
                    pressed && newCategoryName.trim() && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <FontAwesome6 name="add" size={18} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>

          <Input
            label="Description"
            placeholder="Ex : Courses au marché, loyer mars…"
            value={description}
            onChangeText={setDescription}
            maxLength={120}
            returnKeyType="done"
          />

          {/* ── 6. Date ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textMuted }]}>Date</Text>
            <View style={[styles.dateRow, { backgroundColor: c.surface, borderColor: c.border }]}>
              <IconSymbol name="calendar" size={16} color={accentColor} />
              <Text style={[styles.dateText, { color: c.text }]}>
                {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: isDark ? "#451A03" : "#FEF3C7" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={isDark ? "#F59E0B" : "#B45309"} />
              <Text style={[styles.errorText, { color: isDark ? "#F59E0B" : "#92400E" }]}>{error}</Text>
            </View>
          )}

          <Button
            label={
              (isEditing ? "Enregistrer les modifications" : "Enregistrer") +
              (amount > 0 ? ` · ${formatCurrency(amount, selectedBudget?.currency)}` : "")
            }
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={isLoading}
            icon={<IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />}
            style={{ backgroundColor: accentColor, marginTop: 4 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 20 },

  typeToggle: { flexDirection: "row", borderRadius: Radius.lg, padding: 4, gap: 4 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: Radius.md,
    gap: 7,
  },
  typeBtnText: { fontSize: 15, fontWeight: "600" },

  amountBlock: { borderRadius: Radius.xl, padding: 16, borderWidth: 1.5, gap: 14 },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 64 },
  amountUnit: { fontSize: 22, fontWeight: "700", marginTop: 12 },
  amountText: { fontSize: 52, fontWeight: "800", letterSpacing: -2, minWidth: 80, textAlign: "center" },
  amountClearBtn: { position: "absolute", right: 0, top: 0 },

  numpad: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  numKey: { width: "30%", aspectRatio: 2.4, alignItems: "center", justifyContent: "center", borderRadius: Radius.sm },
  numKeyPressed: { opacity: 0.5, transform: [{ scale: 0.94 }] },
  numKeyText: { fontSize: 22, fontWeight: "500" },

  budgetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  budgetChipText: { fontSize: 13, fontWeight: "600" },
  singleBudgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
  },
  singleBudgetText: { fontSize: 13 },

  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  requiredText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  catsLoading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 },
  catsEmpty: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyText: { fontSize: 13, textAlign: "center" },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catItem: {
    width: "22%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 6,
    position: "relative",
  },
  catIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  catIconEmoji: { fontSize: 20 },
  catLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  catCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  newCatRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  newCatBtn: { width: 50, height: 50, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  dateText: { fontSize: 14, fontWeight: "500", textTransform: "capitalize", flex: 1 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: Radius.md, padding: 12 },
  errorText: { fontSize: 13, flex: 1 },
});
