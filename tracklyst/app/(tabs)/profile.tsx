import { Colors, Radius } from "@/constants/theme";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { PressableCard } from "@/src/components/ui/Card";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getInitials(name: string, email: string): string {
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const email = user?.email ?? "";
  const fullName = (user?.user_metadata?.full_name as string) ?? "";
  const initials = getInitials(fullName, email);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: top, paddingBottom: bottom + 12, backgroundColor: c.bg },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.tint }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: c.text }]}>
          {fullName || "Utilisateur"}
        </Text>
        <Text style={[styles.email, { color: c.textMuted }]}>{email}</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <PressableCard
          onPress={() => router.push("/(modal)/settings")}
          style={styles.row}
          padding={14}
        >
          <View style={[styles.rowIcon, { backgroundColor: c.tintMuted }]}>
            <IconSymbol name="gearshape.fill" size={16} color={c.tint} />
          </View>
          <Text style={[styles.rowText, { color: c.text }]}>Paramètres</Text>
          <IconSymbol name="chevron.right" size={14} color={c.textSubtle} />
        </PressableCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  header: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800" },
  email: { fontSize: 13, marginTop: 2 },
  list: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, fontSize: 14, fontWeight: "700" },
});
