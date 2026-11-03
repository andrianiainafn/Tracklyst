import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, View } from "react-native";
import { accountKind } from "@/src/features/budgets/constants/accountLabels";
import { providerFor } from "@/src/features/budgets/constants/providers";
import type { Account } from "../types";

/** Logo de la marque reconnue (MVola, BNI…) ou icône du type de compte. */
export function AccountIcon({ account, size = 36 }: { account: Pick<Account, "kind" | "name">; size?: number }) {
  const provider = providerFor(account.name);
  const radius = Math.round(size * 0.28);
  if (provider) return <Image source={provider.logo} style={{ width: size, height: size, borderRadius: radius }} />;
  const kind = accountKind(account.kind) ?? accountKind("other")!;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: kind.color + "1F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name={kind.icon} size={Math.round(size * 0.55)} color={kind.color} />
    </View>
  );
}

export const accountName = (a: Pick<Account, "kind" | "name">) =>
  a.name?.trim() || accountKind(a.kind)?.label || "Compte";
