import { Colors, Radius } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { ACCOUNT_KINDS, type AccountKind } from "../constants/accountLabels";
import { providerFor } from "../constants/providers";

/**
 * Choix de l'endroit où se trouve l'argent du budget : type (MVola, banque…)
 * puis nom libre, avec suggestions et noms déjà utilisés sur d'autres budgets.
 */
export function AccountPicker({
  kind,
  name,
  onChange,
  usedNames = [],
}: {
  kind: AccountKind | null;
  name: string;
  onChange: (kind: AccountKind | null, name: string) => void;
  usedNames?: string[];
}) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const current = ACCOUNT_KINDS.find((k) => k.id === kind) ?? null;
  const typedProvider = providerFor(name);

  const suggestions = useMemo(() => {
    if (!current) return [];
    const all = [...usedNames, ...current.suggestions];
    return [...new Set(all.map((s) => s.trim()).filter(Boolean))].filter(
      (s) => s.toLowerCase() !== name.trim().toLowerCase(),
    );
  }, [current, usedNames, name]);

  return (
    <View style={styles.root}>
      <View style={styles.kinds}>
        {ACCOUNT_KINDS.map((k) => {
          const active = k.id === kind;
          return (
            <Pressable
              key={k.id}
              onPress={() => onChange(active ? null : k.id, "")}
              style={({ pressed }) => [
                styles.kind,
                {
                  backgroundColor: active ? k.color + "1F" : c.surface,
                  borderColor: active ? k.color : c.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialCommunityIcons name={k.icon} size={18} color={active ? k.color : c.textMuted} />
              <Text style={[styles.kindText, { color: active ? c.text : c.textMuted }]}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {current && (
        <>
          <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
            {typedProvider ? (
              <Image source={typedProvider.logo} style={styles.inputLogo} />
            ) : (
              <MaterialCommunityIcons name={current.icon} size={18} color={current.color} />
            )}
            <TextInput
              value={name}
              onChangeText={(t) => onChange(kind, t)}
              placeholder={
                current.id === "bank" ? "Nom de la banque (ex : BNI Madagascar)" : `Nom (ex : ${current.suggestions[0] ?? "Mon compte"})`
              }
              placeholderTextColor={c.textSubtle}
              maxLength={60}
              style={[styles.input, { color: c.text }]}
            />
          </View>
          {suggestions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {suggestions.map((s) => {
                const logo = providerFor(s)?.logo;
                return (
                  <Pressable
                    key={s}
                    onPress={() => onChange(kind, s)}
                    style={({ pressed }) => [
                      styles.chip,
                      logo ? styles.chipWithLogo : null,
                      { backgroundColor: c.surfaceAlt },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    {logo ? <Image source={logo} style={styles.chipLogo} /> : null}
                    <Text style={[styles.chipText, { color: c.text }]}>{s}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kind: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  kindText: { fontSize: 13, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontSize: 15 },
  chips: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipWithLogo: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 5 },
  chipLogo: { width: 22, height: 22, borderRadius: 6 },
  inputLogo: { width: 24, height: 24, borderRadius: 6 },
});
