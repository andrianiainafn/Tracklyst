import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { budgetService } from "@/src/features/budgets/services/budgetService";
import { sharingService, type BudgetMember } from "@/src/features/budgets/services/sharingService";
import { useBudgetStore } from "@/src/features/budgets/store/budgetStore";
import { getErrorMessage } from "@/src/utils/errors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROLE_LABEL: Record<BudgetMember["role"], string> = {
  owner: "Propriétaire",
  admin: "Admin",
  member: "Membre",
};

async function reloadBudgets() {
  const budgets = await budgetService.getBudgets();
  useBudgetStore.getState().setBudgets(budgets);
  return budgets;
}

export default function ShareBudgetModal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const activeBudget = useBudgetStore((s) => s.activeBudget);

  const [members, setMembers] = useState<BudgetMember[]>([]);
  const [code, setCode] = useState<string | null>(null);
  // Rien à charger tant que le budget n'est pas encore partagé.
  const [loading, setLoading] = useState(activeBudget?.owner_type === "group");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shared = activeBudget?.owner_type === "group";
  const me = members.find((m) => m.is_me);
  const isOwner = !shared || me?.role === "owner";

  useEffect(() => {
    if (!activeBudget || activeBudget.owner_type !== "group") return;
    let cancelled = false;
    sharingService
      .members(activeBudget.id)
      .then(async (list) => {
        const isOwnerNow = list.find((m) => m.is_me)?.role === "owner";
        const ownCode = isOwnerNow ? await sharingService.getShareCode(activeBudget.id) : null;
        if (cancelled) return;
        setMembers(list);
        setCode(ownCode);
      })
      .catch((err) => !cancelled && Alert.alert("Partage", getErrorMessage(err, "Chargement impossible.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeBudget]);

  if (!activeBudget) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted }}>Aucun budget sélectionné.</Text>
      </View>
    );
  }

  const startSharing = async () => {
    setBusy(true);
    try {
      const newCode = await sharingService.getShareCode(activeBudget.id);
      await reloadBudgets();
      setCode(newCode);
      setMembers(await sharingService.members(activeBudget.id));
    } catch (err) {
      Alert.alert("Partage", getErrorMessage(err, "Partage impossible."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = () => {
    if (!code) return;
    Share.share({
      message: `Rejoins mon budget « ${activeBudget.name} » sur Tracklyst avec le code ${code} (Profil → Rejoindre un budget).`,
    });
  };

  const renew = () =>
    Alert.alert("Nouveau code", "L'ancien code ne fonctionnera plus. Les membres actuels restent dans le budget.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Générer",
        onPress: async () => {
          try {
            setCode(await sharingService.getShareCode(activeBudget.id, true));
          } catch (err) {
            Alert.alert("Partage", getErrorMessage(err, "Impossible de générer un code."));
          }
        },
      },
    ]);

  const remove = (m: BudgetMember) =>
    Alert.alert("Retirer ce membre", `${m.display_name} n'aura plus accès à « ${activeBudget.name} ».`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          try {
            await sharingService.removeMember(activeBudget.id, m.user_id);
            setMembers((list) => list.filter((x) => x.user_id !== m.user_id));
          } catch (err) {
            Alert.alert("Partage", getErrorMessage(err, "Retrait impossible."));
          }
        },
      },
    ]);

  const leave = () =>
    Alert.alert("Quitter ce budget", `Vous n'aurez plus accès à « ${activeBudget.name} ».`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Quitter",
        style: "destructive",
        onPress: async () => {
          try {
            await sharingService.leave(activeBudget.id);
            const budgets = await reloadBudgets();
            useBudgetStore.getState().setActiveBudget(budgets[0] ?? null);
            router.back();
          } catch (err) {
            Alert.alert("Partage", getErrorMessage(err, "Impossible de quitter le budget."));
          }
        },
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
    >
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: c.tintMuted }]}>
          <MaterialCommunityIcons name="account-multiple-plus-outline" size={30} color={c.tint} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{activeBudget.name}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Les membres voient et gèrent ce budget avec vous : dépenses, revenus, plafonds, objectifs et rappels.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={c.tint} style={{ marginTop: 24 }} />
      ) : !shared && !code ? (
        <Card style={styles.block}>
          {[
            "Générez un code de 6 caractères.",
            "Envoyez-le à la personne (WhatsApp, SMS…).",
            "Elle le saisit dans Profil → Rejoindre un budget.",
          ].map((t, i) => (
            <View key={t} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: c.tint }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: c.text }]}>{t}</Text>
            </View>
          ))}
          <Button label="Générer le code de partage" onPress={startSharing} loading={busy} />
        </Card>
      ) : (
        <>
          {isOwner && code && (
            <Card style={styles.block}>
              <Text style={[styles.label, { color: c.textSubtle }]}>CODE D&apos;INVITATION</Text>
              <Pressable onPress={copy} style={[styles.codeBox, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Text selectable style={[styles.code, { color: c.text }]}>
                  {code}
                </Text>
              </Pressable>
              <View style={styles.row}>
                <Pressable
                  onPress={copy}
                  style={({ pressed }) => [styles.action, { backgroundColor: c.tint }, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name={copied ? "check" : "content-copy"} size={18} color="#fff" />
                  <Text style={styles.actionText}>{copied ? "Copié" : "Copier"}</Text>
                </Pressable>
                <Pressable
                  onPress={send}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: c.surfaceAlt },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <MaterialCommunityIcons name="share-variant-outline" size={18} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>Envoyer</Text>
                </Pressable>
              </View>
              <Pressable onPress={renew} hitSlop={8}>
                <Text style={[styles.link, { color: c.textMuted }]}>Générer un nouveau code</Text>
              </Pressable>
            </Card>
          )}

          <Text style={[styles.label, { color: c.textSubtle, marginTop: 8 }]}>
            MEMBRES · {members.length}
          </Text>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {members.map((m, i) => (
              <View
                key={m.user_id}
                style={[styles.member, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
              >
                <View style={[styles.avatar, { backgroundColor: m.role === "owner" ? c.tint : "#8B5CF6" }]}>
                  <Text style={styles.avatarText}>{(m.display_name || "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[styles.memberName, { color: c.text }]}>
                    {m.display_name}
                    {m.is_me ? " (vous)" : ""}
                  </Text>
                  <Text numberOfLines={1} style={[styles.memberMeta, { color: c.textSubtle }]}>
                    {ROLE_LABEL[m.role]}
                    {m.email ? ` · ${m.email}` : ""}
                  </Text>
                </View>
                {isOwner && !m.is_me && (
                  <Pressable onPress={() => remove(m)} hitSlop={10}>
                    <MaterialCommunityIcons name="account-remove-outline" size={22} color={c.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </Card>

          {!isOwner && (
            <Pressable onPress={leave} style={[styles.leave, { borderColor: c.danger }]}>
              <MaterialCommunityIcons name="logout" size={18} color={c.danger} />
              <Text style={[styles.leaveText, { color: c.danger }]}>Quitter ce budget</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  hero: { alignItems: "center", gap: 8, paddingVertical: 8 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, textAlign: "center" },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 8 },
  block: { gap: 14 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  stepText: { flex: 1, fontSize: 14 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  codeBox: { borderWidth: 1, borderRadius: Radius.lg, paddingVertical: 18, alignItems: "center" },
  code: { fontSize: 34, fontWeight: "800", letterSpacing: 8, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: Radius.md,
  },
  actionText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  link: { fontSize: 13, fontWeight: "600", textAlign: "center", textDecorationLine: "underline" },
  member: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  memberName: { fontSize: 15, fontWeight: "700" },
  memberMeta: { fontSize: 12, marginTop: 1 },
  leave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 8,
  },
  leaveText: { fontSize: 15, fontWeight: "700" },
});
