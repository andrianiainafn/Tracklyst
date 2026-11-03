import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { normalizeShareCode, sharingService } from "@/src/features/budgets/services/sharingService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { getErrorMessage } from "@/src/utils/errors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

export default function JoinBudgetModal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const budgetId = await sharingService.join(code);
      const budgets = await budgetService.getBudgets();
      const store = useBudgetStore.getState();
      store.setBudgets(budgets);
      store.setActiveBudget(budgets.find((b) => b.id === budgetId) ?? store.activeBudget);
      router.dismissAll();
      router.replace("/(tabs)");
    } catch (err) {
      setError(getErrorMessage(err, "Impossible de rejoindre ce budget."));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: c.tintMuted }]}>
          <MaterialCommunityIcons name="key-variant" size={28} color={c.tint} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Rejoindre un budget</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Saisissez le code de 6 caractères reçu de la personne qui partage son budget.
        </Text>
      </View>

      <TextInput
        autoFocus
        value={code}
        onChangeText={(t) => {
          setCode(normalizeShareCode(t));
          setError(null);
        }}
        onSubmitEditing={join}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="ABC234"
        placeholderTextColor={c.border}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surface, borderColor: error ? c.danger : c.border },
        ]}
      />
      {error && <Text style={[styles.error, { color: c.danger }]}>{error}</Text>}

      <Button label="Rejoindre" onPress={join} loading={busy} disabled={code.length !== 6} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, gap: 16 },
  hero: { alignItems: "center", gap: 8, paddingVertical: 12 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  input: {
    height: 68,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 8,
  },
  error: { fontSize: 13, textAlign: "center" },
});
