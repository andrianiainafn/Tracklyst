import { Colors, Radius, Shadow } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Mise à jour à distance (EAS Update) téléchargée en arrière-plan :
 * propose de redémarrer l'app pour l'appliquer tout de suite.
 */
function UpdateBannerNative() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { bottom } = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);

  if (!Updates.isEnabled || !isUpdatePending || dismissed) return null;

  return (
    <View style={[styles.banner, { bottom: bottom + 96, backgroundColor: c.text }]}>
      <MaterialCommunityIcons name="update" size={20} color={c.bg} />
      <Text style={[styles.text, { color: c.bg }]}>Nouvelle version prête</Text>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
        <Text style={[styles.later, { color: c.bg }]}>Plus tard</Text>
      </Pressable>
      <Pressable
        onPress={() => Updates.reloadAsync().catch(() => setDismissed(true))}
        style={[styles.button, { backgroundColor: c.tint }]}
      >
        <Text style={styles.buttonText}>Redémarrer</Text>
      </Pressable>
    </View>
  );
}

/** Mises à jour à distance : app native uniquement (le web est toujours à jour). */
export const UpdateBanner = Platform.OS === "web" ? () => null : UpdateBannerNative;

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 900,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: Radius.lg,
    ...Shadow.md,
  },
  text: { flex: 1, fontSize: 14, fontWeight: "700" },
  later: { fontSize: 13, fontWeight: "600", opacity: 0.7 },
  button: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
  buttonText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
