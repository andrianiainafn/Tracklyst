import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { CategoryIcon } from "@/src/features/categories/components/CategoryIcon";
import { categoryService } from "@/src/features/categories/services/categoryService";
import { useCategoryStore } from "@/src/features/categories/store/categoryStore";
import type { Category } from "@/src/features/categories/types/category.types";
import { formatCurrency } from "@/src/utils/currency";
import { getErrorMessage } from "@/src/utils/errors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CatType = "expense" | "income";

export default function CategoriesScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { budget_id } = useLocalSearchParams<{ budget_id?: string }>();
  const { activeBudget: storeActive, budgets } = useBudgetStore();
  // Budget ciblé : celui passé en paramètre (ex : depuis une transaction), sinon l'actif.
  const activeBudget = (budget_id && budgets.find((b) => b.id === budget_id)) || storeActive;
  const { categories, setCategories, addCategory } = useCategoryStore();
  const [type, setType] = useState<CatType>("expense");
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Recharge à chaque retour sur l'écran (après ajout / modification).
  useFocusEffect(
    useCallback(() => {
      if (!activeBudget?.id) return;
      categoryService
        .getCategories(activeBudget.id)
        .then(setCategories)
        .catch((e) => Alert.alert("Erreur", getErrorMessage(e, "Impossible de charger les catégories.")))
        .finally(() => setIsLoading(false));
    }, [activeBudget?.id]),
  );

  const list = useMemo(
    () => categories.filter((cat) => cat.type === type && cat.budget_id === activeBudget?.id),
    [categories, type, activeBudget?.id],
  );
  const counts = useMemo(
    () => ({
      expense: categories.filter((cat) => cat.type === "expense").length,
      income: categories.filter((cat) => cat.type === "income").length,
    }),
    [categories],
  );

  const addDefaults = async () => {
    if (!activeBudget) return;
    try {
      setIsSeeding(true);
      const created = await categoryService.addDefaultCategories(activeBudget.id, categories);
      created.forEach(addCategory);
      if (created.length === 0) Alert.alert("Déjà à jour", "Toutes les catégories par défaut sont déjà présentes.");
    } catch (e) {
      Alert.alert("Erreur", getErrorMessage(e, "Impossible d'ajouter les catégories."));
    } finally {
      setIsSeeding(false);
    }
  };

  const openForm = (cat?: Category) =>
    router.push({
      pathname: "/(modal)/category-form",
      params: cat ? { id: cat.id, budget_id: activeBudget?.id } : { type, budget_id: activeBudget?.id },
    } as any);

  if (!activeBudget) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted }}>Sélectionnez d'abord un budget.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 100 }]}>
        <Text style={[styles.intro, { color: c.textMuted }]}>
          Catégories du budget <Text style={{ color: c.text, fontWeight: "700" }}>{activeBudget.name}</Text>.
          Elles servent à classer vos transactions, abonnements et plafonds.
        </Text>

        {/* Dépenses / Revenus */}
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
                  {t === "expense" ? "Dépenses" : "Revenus"} · {counts[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading && categories.length === 0 ? (
          <ActivityIndicator color={c.tint} style={{ marginTop: 24 }} />
        ) : list.length === 0 ? (
          <Card padding={20} style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: c.tintMuted }]}>
              <MaterialCommunityIcons name="shape-outline" size={26} color={c.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              Aucune catégorie de {type === "expense" ? "dépense" : "revenu"}
            </Text>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              Partez des catégories par défaut (Courses, Essence, Loyer, Salaire…) ou créez les vôtres.
            </Text>
            <Button label="Ajouter les catégories par défaut" onPress={addDefaults} loading={isSeeding} style={{ alignSelf: "stretch" }} />
          </Card>
        ) : (
          <Card padding={0} style={styles.list}>
            {list.map((cat, i) => (
              <React.Fragment key={cat.id}>
                {i > 0 && <View style={[styles.separator, { backgroundColor: c.border }]} />}
                <Pressable
                  onPress={() => openForm(cat)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}
                >
                  <CategoryIcon category={cat} size={40} />
                  <View style={styles.rowBody}>
                    <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    {cat.monthly_limit != null && Number(cat.monthly_limit) > 0 && (
                      <Text style={[styles.meta, { color: c.textSubtle }]}>
                        Plafond {formatCurrency(Number(cat.monthly_limit), activeBudget.currency)} /{" "}
                        {cat.limit_period === "week" ? "semaine" : "mois"}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
                </Pressable>
              </React.Fragment>
            ))}
          </Card>
        )}

        {list.length > 0 && (
          <Pressable onPress={addDefaults} disabled={isSeeding} style={styles.linkBtn}>
            {isSeeding ? (
              <ActivityIndicator size="small" color={c.tint} />
            ) : (
              <Text style={[styles.link, { color: c.tint }]}>Compléter avec les catégories par défaut</Text>
            )}
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + 12, backgroundColor: c.bg }]}>
        <Button
          label={`Nouvelle catégorie de ${type === "expense" ? "dépense" : "revenu"}`}
          icon={<Ionicons name="add" size={18} color="#fff" />}
          onPress={() => openForm()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, gap: 14 },
  intro: { fontSize: 13, lineHeight: 19 },
  segment: { flexDirection: "row", borderRadius: Radius.md, padding: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: Radius.sm },
  segmentText: { fontSize: 13, fontWeight: "700" },
  list: { overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: "center", gap: 8 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 8 },
  linkBtn: { alignItems: "center", paddingVertical: 8 },
  link: { fontSize: 13, fontWeight: "700" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8 },
});
