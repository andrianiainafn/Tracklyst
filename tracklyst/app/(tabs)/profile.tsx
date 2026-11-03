import { Colors, Radius } from "@/constants/theme";
import { unregisterPushToken } from "@/src/features/notifications/services/localNotifications";
import { StatusBarScrim } from "@/src/components/ui/StatusBarScrim";
import { Card } from "@/src/components/ui/Card";
import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { authService } from "@/src/features/auth/services/authService";
import { useAuthStore } from "@/src/features/auth/store/authStore";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { useGoals } from "@/src/features/goals/hooks/useGoals";
import { useNotifications } from "@/src/features/notifications/hooks/useNotifications";
import { useSubscriptions } from "@/src/features/subscriptions/hooks/useSubscriptions";
import { getErrorMessage } from "@/src/utils/errors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { ComponentProps } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Palette = typeof Colors.light;
type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

function getInitials(name: string, email: string): string {
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function MenuRow({
  icon,
  tint,
  label,
  detail,
  badge,
  onPress,
  destructive,
  c,
}: {
  icon: IconName;
  tint: string;
  label: string;
  detail?: string;
  badge?: number;
  onPress: () => void;
  destructive?: boolean;
  c: Palette;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}>
      <View style={[styles.rowIcon, { backgroundColor: tint + "1F" }]}>
        <MaterialCommunityIcons name={icon} size={19} color={tint} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: destructive ? c.danger : c.text }]}>{label}</Text>
        {detail && <Text style={[styles.rowDetail, { color: c.textSubtle }]}>{detail}</Text>}
      </View>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: c.danger }]}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
      {!destructive && <MaterialCommunityIcons name="chevron-right" size={20} color={c.textSubtle} />}
    </Pressable>
  );
}

function MenuSection({ title, children, c }: { title: string; children: React.ReactNode; c: Palette }) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.textSubtle }]}>{title}</Text>
      <Card padding={0} style={styles.sectionCard}>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={[styles.separator, { backgroundColor: c.border }]} />}
            {child}
          </React.Fragment>
        ))}
      </Card>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { budgets, activeBudget } = useBudgetStore();
  const { goals } = useGoals();
  const { active: subscriptions, due } = useSubscriptions();
  const { notifications } = useNotifications();

  const email = user?.email ?? "";
  const fullName =
    (user?.user_metadata?.full_name as string) ?? (user?.user_metadata?.display_name as string) ?? "";
  const initials = getInitials(fullName, email);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  const handleSignOut = () => {
    Alert.alert("Se déconnecter", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          try {
            await unregisterPushToken();
            await authService.signOut();
            useAuthStore.getState().clearAuth();
          } catch (err) {
            Alert.alert("Erreur", getErrorMessage(err, "Impossible de se déconnecter pour le moment."));
          }
        },
      },
    ]);
  };

  const stats = [
    { label: "Budgets", value: budgets.length },
    { label: "Objectifs", value: goals.filter((g) => g.status !== "cancelled").length },
    { label: "Abonnements", value: subscriptions.length },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: top + 16, paddingBottom: bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: c.text }]}>Profil</Text>

        {/* Identity */}
        <Card padding={18} style={styles.identity}>
          <View style={styles.identityTop}>
            <View style={[styles.avatar, { backgroundColor: c.tint }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {fullName || "Utilisateur"}
              </Text>
              <Text style={[styles.email, { color: c.textMuted }]} numberOfLines={1}>
                {email}
              </Text>
              {memberSince && (
                <Text style={[styles.since, { color: c.textSubtle }]}>Membre depuis {memberSince}</Text>
              )}
            </View>
          </View>

          <View style={[styles.stats, { backgroundColor: c.surfaceAlt }]}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={[styles.statSep, { backgroundColor: c.border }]} />}
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: c.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Card>

        <MenuSection title="MON BUDGET" c={c}>
          <MenuRow
            icon="wallet-outline"
            tint="#6366F1"
            label="Modifier le budget"
            detail={activeBudget ? `${activeBudget.name} · nom, couleur, suppression` : undefined}
            onPress={() =>
              activeBudget && router.push({ pathname: "/(modal)/add_budget", params: { id: activeBudget.id } })
            }
            c={c}
          />
          <MenuRow
            icon="shape-outline"
            tint="#10B981"
            label="Catégories"
            detail="Ajouter et personnaliser"
            onPress={() => router.push("/(modal)/categories" as any)}
            c={c}
          />
          <MenuRow
            icon="speedometer"
            tint="#0EA5E9"
            label="Plafonds du mois"
            detail={activeBudget ? activeBudget.name : undefined}
            onPress={() => router.push("/(modal)/monthly-limits" as any)}
            c={c}
          />
          <MenuRow
            icon="autorenew"
            tint="#8B5CF6"
            label="Abonnements"
            detail={
              due.length > 0
                ? `${due.length} prélèvement${due.length > 1 ? "s" : ""} à valider`
                : `${subscriptions.length} actif${subscriptions.length > 1 ? "s" : ""}`
            }
            onPress={() => router.push("/(modal)/subscriptions" as any)}
            c={c}
          />
          <MenuRow
            icon="bell-outline"
            tint="#F59E0B"
            label="Notifications"
            badge={notifications.length}
            onPress={() => router.push("/(modal)/notifications" as any)}
            c={c}
          />
        </MenuSection>

        <MenuSection title="PARTAGE" c={c}>
          <MenuRow
            icon="account-multiple-plus-outline"
            tint="#0EA5E9"
            label="Partager le budget"
            detail={
              activeBudget
                ? `${activeBudget.name}${activeBudget.owner_type === "group" ? " · partagé" : ""}`
                : undefined
            }
            onPress={() => router.push("/(modal)/share-budget" as any)}
            c={c}
          />
          <MenuRow
            icon="key-variant"
            tint="#F59E0B"
            label="Rejoindre un budget"
            detail="Avec un code reçu"
            onPress={() => router.push("/(modal)/join-budget" as any)}
            c={c}
          />
        </MenuSection>

        <MenuSection title="COMPTE" c={c}>
          <MenuRow
            icon="cog-outline"
            tint={c.textMuted}
            label="Paramètres"
            onPress={() => router.push("/(modal)/settings")}
            c={c}
          />
          <MenuRow icon="logout" tint={c.danger} label="Se déconnecter" onPress={handleSignOut} destructive c={c} />
        </MenuSection>
      </ScrollView>
      <StatusBarScrim />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },

  identity: { gap: 16 },
  identityTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  identityText: { flex: 1 },
  name: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  email: { fontSize: 13, marginTop: 2 },
  since: { fontSize: 12, marginTop: 4 },
  stats: { flexDirection: "row", borderRadius: Radius.md, paddingVertical: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  statSep: { width: 1 },

  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, paddingHorizontal: 4 },
  sectionCard: { overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowDetail: { fontSize: 12, marginTop: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
