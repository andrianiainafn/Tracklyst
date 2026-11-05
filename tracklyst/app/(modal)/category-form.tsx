import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import {
  CategoryIconName,
  iconForLabel,
  resolveCategoryIcon,
} from "@/src/features/categories/constants/categoryIcons";
import {
  CATEGORY_COLORS,
  EXPENSE_ICON_CHOICES,
  INCOME_ICON_CHOICES,
} from "@/src/features/categories/constants/categoryPresets";
import { categoryService } from "@/src/features/categories/services/categoryService";
import { useCategoryStore } from "@/src/features/categories/store/categoryStore";
import { getErrorMessage } from "@/src/utils/errors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

type CatType = "expense" | "income";

export default function CategoryFormScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; type?: CatType; budget_id?: string }>();

  const { activeBudget: storeActive, budgets } = useBudgetStore();
  const activeBudget = (params.budget_id && budgets.find((b) => b.id === params.budget_id)) || storeActive;
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
  const existing = params.id ? categories.find((cat) => cat.id === params.id) : undefined;
  const isEditing = !!existing;

  const [type, setType] = useState<CatType>(existing?.type ?? params.type ?? "expense");
  const [name, setName] = useState(existing?.name ?? "");
  const [icon, setIcon] = useState<CategoryIconName>(
    existing ? resolveCategoryIcon(existing) : type === "income" ? "cash-multiple" : "tag-outline",
  );
  // Tant que l'utilisateur n'a pas choisi d'icône, on la déduit du nom.
  const [iconTouched, setIconTouched] = useState(isEditing);
  const [color, setColor] = useState(existing?.color ?? CATEGORY_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? "Modifier la catégorie" : "Nouvelle catégorie" });
  }, [isEditing]);

  useEffect(() => {
    if (iconTouched) return;
    const guessed = iconForLabel(name);
    if (guessed) setIcon(guessed);
  }, [name, iconTouched]);

  const choices = type === "income" ? INCOME_ICON_CHOICES : EXPENSE_ICON_CHOICES;
  const trimmed = name.trim();
  const duplicate = categories.some(
    (cat) =>
      cat.id !== existing?.id &&
      cat.type === type &&
      cat.budget_id === activeBudget?.id &&
      cat.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const canSubmit = !!activeBudget && trimmed.length > 0 && !duplicate && !isSaving;

  const handleSave = async () => {
    if (!canSubmit || !activeBudget) return;
    try {
      setIsSaving(true);
      if (existing) {
        updateCategory(await categoryService.updateCategory(existing.id, { name: trimmed, icon, color }));
      } else {
        addCategory(
          await categoryService.createCategory({ budget_id: activeBudget.id, name: trimmed, type, icon, color }),
        );
      }
      router.back();
    } catch (e) {
      Alert.alert("Erreur", getErrorMessage(e, "Impossible d'enregistrer la catégorie."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert(
      `Supprimer « ${existing.name} » ?`,
      "Les abonnements liés à cette catégorie seront aussi supprimés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await categoryService.deleteCategory(existing.id);
              deleteCategory(existing.id);
              router.back();
            } catch (e: any) {
              // 23503 = clé étrangère : des transactions utilisent encore la catégorie.
              Alert.alert(
                "Suppression impossible",
                e?.code === "23503"
                  ? "Des transactions utilisent cette catégorie. Modifiez ou supprimez-les d'abord, ou renommez simplement la catégorie."
                  : getErrorMessage(e, "Suppression impossible."),
              );
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
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {/* Aperçu */}
        <View style={styles.preview}>
          <CategoryIcon icon={icon} color={color} size={72} />
          <Text style={[styles.previewName, { color: trimmed ? c.text : c.textSubtle }]} numberOfLines={1}>
            {trimmed || "Nom de la catégorie"}
          </Text>
          <Text style={[styles.previewType, { color: c.textMuted }]}>
            {type === "expense" ? "Dépense" : "Revenu"}
          </Text>
        </View>

        {!isEditing && (
          <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
            {(["expense", "income"] as const).map((t) => {
              const selected = type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.segmentItem, selected && { backgroundColor: c.surface }]}
                >
                  <Text style={[styles.segmentText, { color: selected ? c.text : c.textMuted }]}>
                    {t === "expense" ? "Dépense" : "Revenu"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Input
          label="Nom"
          placeholder={type === "expense" ? "Ex : Essence, Internet, École…" : "Ex : Salaire, Freelance…"}
          value={name}
          onChangeText={setName}
          maxLength={40}
          error={duplicate ? "Une catégorie porte déjà ce nom." : undefined}
        />

        {/* Icône */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.textMuted }]}>Icône</Text>
          <View style={styles.iconGrid}>
            {choices.map((name) => {
              const selected = icon === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => {
                    setIcon(name);
                    setIconTouched(true);
                  }}
                  style={[
                    styles.iconCell,
                    {
                      backgroundColor: selected ? color : c.surface,
                      borderColor: selected ? color : c.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name={name} size={22} color={selected ? "#fff" : c.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Couleur */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.textMuted }]}>Couleur</Text>
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((col) => {
              const selected = color === col;
              return (
                <Pressable
                  key={col}
                  onPress={() => setColor(col)}
                  style={[styles.colorDot, { backgroundColor: col }, selected && { borderColor: c.text, borderWidth: 3 }]}
                >
                  {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label={isEditing ? "Enregistrer" : "Créer la catégorie"}
          onPress={handleSave}
          disabled={!canSubmit}
          loading={isSaving}
        />
        {isEditing && <Button label="Supprimer" variant="destructive" onPress={handleDelete} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 18 },
  preview: { alignItems: "center", gap: 6, paddingVertical: 8 },
  previewName: { fontSize: 18, fontWeight: "800", marginTop: 6 },
  previewType: { fontSize: 12, fontWeight: "600" },
  segment: { flexDirection: "row", borderRadius: Radius.md, padding: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: Radius.sm },
  segmentText: { fontSize: 13, fontWeight: "700" },
  section: { gap: 10 },
  label: { fontSize: 13, fontWeight: "600" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
