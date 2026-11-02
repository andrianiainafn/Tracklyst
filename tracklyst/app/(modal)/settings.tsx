import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { authService } from "@/src/features/auth/services/authService";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useAuthStore } from "@/src/features/auth/store/authStore";
import Constants from "expo-constants";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, useColorScheme, View } from "react-native";

export default function Settings() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const email = user?.email ?? "";
  const fullName = (user?.user_metadata?.full_name as string) ?? "";

  const handleSignOut = () => {
    Alert.alert(
      "Se déconnecter",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await authService.signOut();
              useAuthStore.getState().clearAuth();
            } catch (err) {
              Alert.alert(
                "Erreur",
                err instanceof Error
                  ? err.message
                  : "Impossible de se déconnecter pour le moment.",
              );
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <Text style={[styles.sectionLabel, { color: c.textSubtle }]}>Compte</Text>
      <Card>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: c.tintMuted }]}>
            <IconSymbol name="person.fill" size={16} color={c.tint} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: c.text }]}>
              {fullName || "Utilisateur"}
            </Text>
            <Text style={[styles.rowSubtitle, { color: c.textMuted }]}>{email}</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: c.textSubtle }]}>Session</Text>
      <Button
        label="Se déconnecter"
        variant="destructive"
        loading={isSigningOut}
        onPress={handleSignOut}
        icon={<IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={c.danger} />}
      />

      <Text style={[styles.sectionLabel, { color: c.textSubtle }]}>À propos</Text>
      <Card>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: c.text }]}>Version</Text>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>
            {Constants.expoConfig?.version ?? "—"}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "space-between" },
  iconWrap: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 13 },
});
