import { Colors, Radius } from "@/constants/theme";
import { usePrivacyStore } from "@/src/features/privacy/store/privacyStore";
import { formatCurrency, getCurrencySymbol } from "@/src/utils/currency";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolveBudgetTheme } from "../constants/budgetThemes";
import type { Budget } from "../types/budget.types";

/**
 * Panneau du bas pour changer de budget : liste avec solde, budget actif
 * coché, création d'un nouveau budget.
 */
export function BudgetSwitcherSheet({
  visible,
  budgets,
  activeId,
  balances,
  onSelect,
  onCreate,
  onJoin,
  onEdit,
  onClose,
}: {
  visible: boolean;
  budgets: Budget[];
  activeId?: string;
  balances: Record<string, number | undefined>;
  onSelect: (budget: Budget) => void;
  onCreate: () => void;
  onJoin: () => void;
  onEdit: (budget: Budget) => void;
  onClose: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { bottom } = useSafeAreaInsets();
  const hidden = usePrivacyStore((s) => s.hidden);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Mes budgets</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            {budgets.length} budget{budgets.length > 1 ? "s" : ""}
          </Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
          {budgets.map((b) => {
            const theme = resolveBudgetTheme(b);
            const active = b.id === activeId;
            const balance = balances[b.id];
            return (
              <Pressable
                key={b.id}
                onPress={() => onSelect(b)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active ? c.tintMuted : c.surfaceAlt,
                    borderColor: active ? c.tint : "transparent",
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: theme.to }]}>
                  <MaterialCommunityIcons name={b.owner_type === "group" ? "account-multiple" : "wallet-outline"} size={20} color="#fff" />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={[styles.meta, { color: c.textMuted }]} numberOfLines={1}>
                    {balance === undefined
                      ? b.currency
                      : hidden
                        ? `••••• ${getCurrencySymbol(b.currency)}`
                        : formatCurrency(Math.round(balance), b.currency)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onEdit(b)}
                  hitSlop={10}
                  accessibilityLabel={`Modifier ${b.name}`}
                  style={({ pressed }) => [styles.edit, { backgroundColor: c.surface }, pressed && { opacity: 0.6 }]}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={17} color={c.textMuted} />
                </Pressable>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={c.tint} />
                ) : (
                  <View style={[styles.radio, { borderColor: c.border }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={onCreate}
          style={({ pressed }) => [styles.create, { borderColor: c.border }, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add" size={18} color={c.tint} />
          <Text style={[styles.createText, { color: c.tint }]}>Nouveau budget</Text>
        </Pressable>
        <Pressable onPress={onJoin} hitSlop={8} style={({ pressed }) => [styles.join, pressed && { opacity: 0.6 }]}>
          <MaterialCommunityIcons name="key-variant" size={16} color={c.textMuted} />
          <Text style={[styles.joinText, { color: c.textMuted }]}>Rejoindre un budget avec un code</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(2, 6, 23, 0.45)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
    maxHeight: "75%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  header: { gap: 2 },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 12 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 13, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  edit: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  create: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  createText: { fontSize: 15, fontWeight: "700" },
  join: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  joinText: { fontSize: 14, fontWeight: "600" },
});
