import { Colors } from "@/constants/theme";
import { unregisterPushToken } from "@/src/features/notifications/services/localNotifications";
import { IconSymbol } from "@/src/components/ui/icon-symbol";
import { Button } from "@/src/components/ui/Button";
import { Card, PressableCard } from "@/src/components/ui/Card";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { authService } from "@/src/features/auth/services/authService";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useAuthStore } from "@/src/features/auth/store/authStore";
import Constants from "expo-constants";
import {
  isEnabled as notificationsEnabled,
  setEnabled as setNotificationsEnabled,
} from "@/src/features/notifications/services/localNotifications";
import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, useColorScheme, View } from "react-native";

export default function Settings() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [remindersOn, setRemindersOn] = useState(true);

  useEffect(() => {
    notificationsEnabled().then(setRemindersOn);
  }, []);

  const toggleReminders = async (value: boolean) => {
    setRemindersOn(value);
    const granted = await setNotificationsEnabled(value);
    if (value && !granted) {
      setRemindersOn(false);
      await setNotificationsEnabled(false);
      Alert.alert(
        "Notifications bloquées",
        "Autorisez les notifications de l'application dans les réglages du téléphone.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Ouvrir les réglages", onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

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
              await unregisterPushToken();
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
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={styles.screen}>
      <Text style={[styles.sectionLabel, { color: c.textSubtle }]}>Budget</Text>
      <View style={{ gap: 8 }}>
        <PressableCard onPress={() => router.push("/(modal)/categories" as any)} padding={14}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: "#8B5CF61F" }]}>
              <MaterialCommunityIcons name="shape-outline" size={18} color="#8B5CF6" />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: c.text }]}>Catégories</Text>
              <Text style={[styles.rowSubtitle, { color: c.textMuted }]}>Ajouter, renommer, choisir icône et couleur</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.textSubtle} />
          </View>
        </PressableCard>
        <PressableCard onPress={() => router.push("/(modal)/monthly-limits" as any)} padding={14}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: "#0EA5E91F" }]}>
              <MaterialCommunityIcons name="speedometer" size={18} color="#0EA5E9" />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: c.text }]}>Plafonds du mois</Text>
              <Text style={[styles.rowSubtitle, { color: c.textMuted }]}>Limite de dépense par catégorie</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.textSubtle} />
          </View>
        </PressableCard>
      </View>

      <Text style={[styles.sectionLabel, { color: c.textSubtle }]}>Notifications</Text>
      <Card padding={14}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: "#F59E0B1F" }]}>
            <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#F59E0B" />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: c.text }]}>Rappels et alertes</Text>
            <Text style={[styles.rowSubtitle, { color: c.textMuted }]}>
              Prélèvements, plafonds à 80 % et dépassés, échéances d'objectifs
            </Text>
          </View>
          <Switch
            value={remindersOn}
            onValueChange={toggleReminders}
            trackColor={{ true: c.tint, false: c.border }}
            thumbColor="#fff"
          />
        </View>
      </Card>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40 },
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
