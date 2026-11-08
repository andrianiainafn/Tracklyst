import { Colors, Radius } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { ComponentProps, useEffect, useRef } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type QuickAction = "expense" | "income" | "budget" | "goal" | "subscription" | "plan";

const SECONDARY: { id: QuickAction; icon: IconName; tint: string; label: string; detail: string }[] = [
  { id: "plan", icon: "calculator-variant-outline", tint: "#10B981", label: "Plan du salaire", detail: "Ce qui reste après les plafonds, réparti sur les objectifs" },
  { id: "budget", icon: "wallet-plus-outline", tint: "#0EA5E9", label: "Nouveau budget", detail: "Séparer foyer, épargne, projet…" },
  { id: "goal", icon: "flag-plus-outline", tint: "#10B981", label: "Nouvel objectif", detail: "Terrain, moto, fonds d'urgence…" },
  { id: "subscription", icon: "autorenew", tint: "#8B5CF6", label: "Paiement régulier", detail: "Cotisation de la semaine, loyer, internet…" },
];

/**
 * Menu du bouton + : dépense et revenu en premier, puis création de budget,
 * d'objectif et d'abonnement. L'action choisie est lancée une fois le panneau
 * fermé (iOS refuse d'ouvrir un écran modal pendant la fermeture d'un autre).
 */
export function QuickActionsSheet({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (action: QuickAction) => void;
  onClose: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { bottom } = useSafeAreaInsets();
  const pending = useRef<QuickAction | null>(null);

  const runPending = () => {
    const action = pending.current;
    pending.current = null;
    if (action) onPick(action);
  };

  // onDismiss n'existe que sur iOS : sur Android on lance l'action dès la fermeture.
  useEffect(() => {
    if (!visible && Platform.OS !== "ios") runPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pick = (action: QuickAction) => {
    pending.current = action;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={runPending}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <Text style={[styles.title, { color: c.text }]}>Ajouter</Text>

        <View style={styles.primaryRow}>
          {(
            [
              { id: "expense", label: "Dépense", icon: "arrow-top-right", color: c.chartExpense },
              { id: "income", label: "Revenu", icon: "arrow-bottom-left", color: c.chartIncome },
            ] as const
          ).map((a) => (
            <Pressable
              key={a.id}
              onPress={() => pick(a.id)}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: a.color + "1A", borderColor: a.color + "40" },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={[styles.primaryIcon, { backgroundColor: a.color }]}>
                <MaterialCommunityIcons name={a.icon} size={22} color="#fff" />
              </View>
              <Text style={[styles.primaryLabel, { color: c.text }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.list, { backgroundColor: c.surfaceAlt }]}>
          {SECONDARY.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && <View style={[styles.separator, { backgroundColor: c.border }]} />}
              <Pressable
                onPress={() => pick(a.id)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: a.tint + "1F" }]}>
                  <MaterialCommunityIcons name={a.icon} size={20} color={a.tint} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowLabel, { color: c.text }]}>{a.label}</Text>
                  <Text style={[styles.rowDetail, { color: c.textSubtle }]}>{a.detail}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={c.textSubtle} />
              </Pressable>
            </React.Fragment>
          ))}
        </View>
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
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  primaryRow: { flexDirection: "row", gap: 10 },
  primary: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  primaryIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  primaryLabel: { fontSize: 15, fontWeight: "700" },
  list: { borderRadius: Radius.lg, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowDetail: { fontSize: 12, marginTop: 1 },
});
