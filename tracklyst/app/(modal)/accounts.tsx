import { Colors, Radius } from "@/constants/theme";
import { Card } from "@/src/components/ui/Card";
import { AccountIcon, accountName } from "@/src/features/accounts/components/AccountIcon";
import { accountService } from "@/src/features/accounts/services/accountService";
import { useAccountStore } from "@/src/features/accounts/store/accountStore";
import type { Transfer } from "@/src/features/accounts/types";
import { useActiveBudget } from "@/src/features/budgets/hooks/useActiveBudget";
import { useGoalStore } from "@/src/features/goals/store/goalStore";
import { usePrivacyStore } from "@/src/features/privacy/store/privacyStore";
import { formatCurrency } from "@/src/utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Palette = typeof Colors.light;

function Row({ c, children, onPress, first }: { c: Palette; children: React.ReactNode; onPress?: () => void; first: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
        pressed && onPress && { backgroundColor: c.surfaceAlt },
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Comptes du budget actif : solde de chacun, transferts récents. */
export default function AccountsModal() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { activeBudget, balance } = useActiveBudget();
  const { accounts, balances, load } = useAccountStore();
  const goals = useGoalStore((s) => s.goals);
  const hidden = usePrivacyStore((s) => s.hidden);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!activeBudget) return;
      load(activeBudget.id).catch(() => {});
      accountService.getTransfers(activeBudget.id).then(setTransfers).catch(() => {});
    }, [activeBudget?.id]),
  );

  const currency = activeBudget?.currency ?? "MGA";
  const show = (n: number) => (hidden ? "•••••" : formatCurrency(Math.round(n), currency));
  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);
  const unassigned = balances.none ?? 0;
  const locked = goals.filter((g) => g.status !== "cancelled").reduce((a, g) => a + Number(g.current_amount), 0);
  const available = balance?.available_balance ?? 0;
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}>
      <Card>
        <Text style={[styles.muted, { color: c.textMuted }]}>Solde disponible du budget</Text>
        <Text style={[styles.total, { color: c.text }]}>{show(available)}</Text>
        {locked > 0 && (
          <Text style={[styles.hint, { color: c.textSubtle }]}>
            Total des comptes {show(available + locked)} dont {show(locked)} mis de côté dans vos objectifs
          </Text>
        )}
      </Card>

      <View style={styles.actions}>
        <Pressable
          disabled={active.length < 2}
          onPress={() => router.push("/(modal)/transfer" as any)}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: c.tint, opacity: active.length < 2 ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" />
          <Text style={[styles.actionText, { color: "#fff" }]}>Transférer</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(modal)/account-form" as any)}
          style={({ pressed }) => [styles.action, styles.dashed, { borderColor: c.tint }, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="plus" size={20} color={c.tint} />
          <Text style={[styles.actionText, { color: c.tint }]}>Ajouter</Text>
        </Pressable>
      </View>

      <Text style={[styles.section, { color: c.textSubtle }]}>MES COMPTES</Text>
      {active.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>
          Aucun compte. Ajoutez où se trouve votre argent : MVola, banque, espèces…
        </Text>
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          {active.map((a, i) => (
            <Row
              key={a.id}
              c={c}
              first={i === 0}
              onPress={() => router.push({ pathname: "/(modal)/account-form", params: { id: a.id } } as any)}
            >
              <AccountIcon account={a} size={40} />
              <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
                {accountName(a)}
              </Text>
              <Text style={[styles.amount, { color: (balances[a.id] ?? 0) < 0 ? c.danger : c.text }]}>
                {show(balances[a.id] ?? 0)}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={c.textSubtle} />
            </Row>
          ))}
          {unassigned !== 0 && (
            <Row c={c} first={false}>
              <View style={[styles.unknown, { backgroundColor: c.surfaceAlt }]}>
                <Text style={{ color: c.textMuted, fontWeight: "800" }}>?</Text>
              </View>
              <Text style={[styles.name, { color: c.textMuted }]}>Sans compte</Text>
              <Text style={[styles.amount, { color: c.textMuted }]}>{show(unassigned)}</Text>
            </Row>
          )}
        </Card>
      )}

      {archived.length > 0 && (
        <>
          <Text style={[styles.section, { color: c.textSubtle }]}>ARCHIVÉS</Text>
          <Card padding={0} style={{ overflow: "hidden", opacity: 0.65 }}>
            {archived.map((a, i) => (
              <Row
                key={a.id}
                c={c}
                first={i === 0}
                onPress={() => router.push({ pathname: "/(modal)/account-form", params: { id: a.id } } as any)}
              >
                <AccountIcon account={a} size={32} />
                <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
                  {accountName(a)}
                </Text>
                <Text style={[styles.amount, { color: c.text }]}>{show(balances[a.id] ?? 0)}</Text>
              </Row>
            ))}
          </Card>
        </>
      )}

      {transfers.length > 0 && (
        <>
          <Text style={[styles.section, { color: c.textSubtle }]}>DERNIERS TRANSFERTS</Text>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {transfers.slice(0, 10).map((t, i) => {
              const from = byId.get(t.from_account_id);
              const to = byId.get(t.to_account_id);
              return (
                <Row key={t.id} c={c} first={i === 0}>
                  <View style={styles.pair}>
                    {from && <AccountIcon account={from} size={26} />}
                    <MaterialCommunityIcons name="arrow-right" size={14} color={c.textSubtle} />
                    {to && <AccountIcon account={to} size={26} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[styles.small, { color: c.text }]}>
                      {from ? accountName(from) : "?"} → {to ? accountName(to) : "?"}
                    </Text>
                    <Text numberOfLines={1} style={[styles.hint, { color: c.textSubtle }]}>
                      {t.date}
                      {t.description ? ` · ${t.description}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.small, { color: c.text, fontWeight: "800" }]}>{show(Number(t.amount))}</Text>
                </Row>
              );
            })}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  muted: { fontSize: 12, fontWeight: "600" },
  total: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, marginTop: 2 },
  hint: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dashed: { borderWidth: 1, borderStyle: "dashed" },
  actionText: { fontSize: 15, fontWeight: "700" },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 6 },
  empty: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  name: { flex: 1, fontSize: 15, fontWeight: "700" },
  amount: { fontSize: 15, fontWeight: "800" },
  unknown: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  pair: { flexDirection: "row", alignItems: "center", gap: 3 },
  small: { fontSize: 13, fontWeight: "600" },
});
