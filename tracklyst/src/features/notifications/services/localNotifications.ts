import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { CategorySpending } from "@/src/features/categories/hooks/useMonthlySpending";
import type { Goal } from "@/src/features/goals/types/goal.types";
import type { Subscription } from "@/src/features/subscriptions/types/subscription.types";
import { supabase } from "@/src/lib/supabase";
import { formatCurrency } from "@/src/utils/currency";

/**
 * Deux modes :
 *  - « server » : l'app compilée (EAS) enregistre son jeton Expo ; les
 *    rappels et alertes sont envoyés par Supabase (push-reminders,
 *    push-limit-alert), même app fermée.
 *  - « local » : repli quand aucun jeton n'est disponible (Expo Go sur
 *    Android) ; les rappels sont programmés sur l'appareil.
 */

const CHANNEL_ID = "reminders";
const ENABLED_KEY = "notifications:enabled";
const TOKEN_KEY = "notifications:push-token";
const REMINDER_HOUR = 9; // les rappels tombent à 9 h
const GOAL_NOTICE_DAYS = 7;

// Préfixes des identifiants : permettent de resynchroniser chaque famille.
const SUB_PREFIX = "sub:";
const GOAL_PREFIX = "goal:";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Préférence & permission ──────────────────────────────────────────────────

export async function isEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== "false";
  } catch {
    return true;
  }
}

/** Demande la permission si besoin. Retourne true si les notifications sont autorisées. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Rappels et alertes",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#10B981",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function setEnabled(enabled: boolean): Promise<boolean> {
  await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  if (!enabled) {
    await unregisterPushToken();
    await Notifications.cancelAllScheduledNotificationsAsync();
    return false;
  }
  if (!(await ensurePermission())) return false;
  await registerPushToken();
  return true;
}

async function canNotify() {
  if (!(await isEnabled())) return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

// ─── Push serveur ─────────────────────────────────────────────────────────────

export type DeliveryMode = "server" | "local" | "off";

/**
 * Enregistre le jeton push de l'appareil dans Supabase. Retourne le mode
 * de livraison : « server » si le jeton est enregistré, sinon « local ».
 */
export async function registerPushToken(): Promise<DeliveryMode> {
  if (!(await isEnabled()) || !(await ensurePermission())) return "off";
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("register_push_token", {
      p_token: token,
      p_platform: Platform.OS,
    });
    if (error) throw error;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    // Le serveur prend le relais : on retire les rappels locaux (doublons).
    await cancelFamilies([SUB_PREFIX, GOAL_PREFIX]);
    return "server";
  } catch (err) {
    // Expo Go sur Android ne fournit pas de jeton push : repli local.
    if (__DEV__) console.warn("[notifications] push serveur indisponible", err);
    return "local";
  }
}

/** À appeler avant la déconnexion : l'appareil ne reçoit plus les push du compte. */
export async function unregisterPushToken() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.from("push_tokens").delete().eq("token", token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    if (__DEV__) console.warn("[notifications] désinscription", err);
  }
}

async function cancelFamilies(prefixes: string[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => prefixes.some((p) => n.identifier.startsWith(p)))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" à REMINDER_HOUR, décalé de `offsetDays`. */
function reminderDate(iso: string, offsetDays = 0) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d + offsetDays, REMINDER_HOUR, 0, 0);
}

type Planned = { id: string; date: Date; title: string; body: string; url: string };

/**
 * Remplace toutes les notifications programmées d'une famille (préfixe)
 * par la liste voulue. Les dates passées sont ignorées.
 */
async function syncFamily(prefix: string, planned: Planned[]) {
  const now = Date.now();
  const wanted = planned.filter((p) => p.date.getTime() > now);
  const wantedIds = new Set(wanted.map((p) => p.id));

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix) && !wantedIds.has(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  // Même identifiant = la notification existante est remplacée.
  await Promise.all(
    wanted.map((p) =>
      Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: { title: p.title, body: p.body, data: { url: p.url } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: p.date,
          channelId: CHANNEL_ID,
        },
      }),
    ),
  );
}

// ─── Abonnements : rappel le jour du prélèvement ──────────────────────────────

export async function syncSubscriptionReminders(subs: Subscription[], currency: string) {
  if (!(await canNotify())) return;
  await syncFamily(
    SUB_PREFIX,
    subs
      .filter((s) => s.is_active)
      .map((s) => ({
        // L'échéance fait partie de l'id : une échéance validée ne re-sonne pas.
        id: `${SUB_PREFIX}${s.id}:${s.next_occurrence}`,
        date: reminderDate(s.next_occurrence),
        title: "Prélèvement aujourd'hui",
        body: `${s.description ?? "Abonnement"} · ${formatCurrency(Number(s.amount), currency)}. Validez-le ou ignorez-le dans Tracklyst.`,
        url: "/(tabs)",
      })),
  );
}

// ─── Objectifs : 7 jours avant l'échéance + le jour J ────────────────────────

export async function syncGoalReminders(goals: Goal[], currency: string) {
  if (!(await canNotify())) return;
  const planned: Planned[] = [];
  for (const g of goals) {
    if (!g.deadline || g.status !== "in_progress") continue;
    const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
    if (remaining <= 0) continue;
    const left = formatCurrency(Math.round(remaining), currency);
    planned.push(
      {
        id: `${GOAL_PREFIX}${g.id}:soon:${g.deadline}`,
        date: reminderDate(g.deadline, -GOAL_NOTICE_DAYS),
        title: "Échéance dans 7 jours",
        body: `« ${g.name} » : il reste ${left} à mettre de côté.`,
        url: "/(tabs)/goals",
      },
      {
        id: `${GOAL_PREFIX}${g.id}:due:${g.deadline}`,
        date: reminderDate(g.deadline),
        title: "Échéance aujourd'hui",
        body: `« ${g.name} » arrive à échéance. Il reste ${left}.`,
        url: "/(tabs)/goals",
      },
    );
  }
  await syncFamily(GOAL_PREFIX, planned);
}

// ─── Plafonds : alerte immédiate à 80 % puis au dépassement ───────────────────

const LEVEL = { ok: 0, warning: 1, over: 2 } as const;

/**
 * Alerte une seule fois par catégorie, par mois et par niveau : à 80 %
 * puis au dépassement. Appelé après chaque recalcul des dépenses du mois.
 */
export async function notifyLimitAlerts(items: CategorySpending[], currency: string) {
  if (!(await canNotify())) return;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const item of items) {
    const level = LEVEL[item.status];
    if (level === 0) continue;
    const key = `notifications:limit:${item.category.id}:${month}`;
    const already = Number((await AsyncStorage.getItem(key)) ?? 0);
    if (level <= already) continue;
    await AsyncStorage.setItem(key, String(level));

    const name = item.category.name;
    const over = item.status === "over";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: over ? `Plafond ${name} dépassé` : `${name} : ${Math.round(item.ratio * 100)} % du plafond`,
        body: over
          ? `Dépassé de ${formatCurrency(Math.round(-item.remaining), currency)} ce mois-ci.`
          : `Il vous reste ${formatCurrency(Math.round(item.remaining), currency)} sur ${formatCurrency(Math.round(item.limit), currency)}.`,
        data: { url: "/(tabs)" },
      },
      trigger: null,
    });
  }
}
