import { Colors, Radius } from "@/constants/theme";
import { IconSymbol } from "@/src/components/ui/icon-symbol.ios";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import {
  AppNotification,
  NotificationSeverity,
  useNotifications,
} from "@/src/features/notifications/hooks/useNotifications";
import React from "react";
import { ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

function NotificationCard({
  item,
  isDark,
}: {
  item: AppNotification;
  isDark: boolean;
}) {
  const c = isDark ? Colors.dark : Colors.light;
  const tones: Record<NotificationSeverity, { bg: string; fg: string }> = {
    danger: { bg: c.dangerMuted, fg: c.danger },
    warning: { bg: isDark ? "#451A03" : "#FEF3C7", fg: isDark ? "#F59E0B" : "#B45309" },
    info: { bg: isDark ? "#0C2340" : "#DBEAFE", fg: isDark ? "#60A5FA" : "#3B82F6" },
    success: { bg: c.tintMuted, fg: c.tint },
  };
  const { bg, fg } = tones[item.severity];

  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <IconSymbol name={item.icon as any} size={18} color={fg} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: c.text }]}>{item.title}</Text>
        <Text style={[styles.cardMessage, { color: c.textMuted }]}>{item.message}</Text>
      </View>
    </Card>
  );
}

export default function NotificationsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { notifications, isLoading } = useNotifications();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
    >
      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Tout est en ordre"
          subtitle="Aucune alerte sur votre budget actif pour le moment."
        />
      )}

      {notifications.map((item) => (
        <NotificationCard key={item.id} item={item} isDark={isDark} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 10 },
  card: { flexDirection: "row", gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  cardMessage: { fontSize: 12, marginTop: 2, lineHeight: 17 },
});
