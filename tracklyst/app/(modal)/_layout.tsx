import { Colors } from "@/constants/theme";
import { IconSymbol } from "@/src/components/ui/icon-symbol";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";

function CloseButton() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <IconSymbol name="xmark.circle.fill" size={26} color={c.textSubtle} />
    </Pressable>
  );
}

// Ce fichier est OBLIGATOIRE pour qu'Expo Router enregistre (modal) comme groupe.
// Sans lui, les Stack.Screen name="(modal)" dans le root layout échouent.
export default function ModalLayout() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const commonOptions = {
    presentation: "modal" as const,
    headerShown: true,
    headerStyle: { backgroundColor: c.surface },
    headerTintColor: c.text,
    headerTitleStyle: { fontWeight: "700" as const, fontSize: 17 },
    headerShadowVisible: false,
    headerLeft: () => null,
    headerRight: () => <CloseButton />,
  };

  return (
    <Stack>
      <Stack.Screen
        name="add-transaction"
        options={{ ...commonOptions, title: "Nouvelle transaction" }}
      />
      <Stack.Screen
        name="add_budget"
        options={{ ...commonOptions, title: "Nouveau budget" }}
      />
      <Stack.Screen
        name="add-goal"
        options={{ ...commonOptions, title: "Nouvel objectif" }}
      />
      <Stack.Screen
        name="goal-movement"
        options={{ ...commonOptions, title: "Mouvement" }}
      />
      <Stack.Screen
        name="goal-transfer"
        options={{ ...commonOptions, title: "Mouvement objectif" }}
      />
      <Stack.Screen
        name="monthly-limits"
        options={{ ...commonOptions, title: "Plafonds" }}
      />
      <Stack.Screen
        name="salary-plan"
        options={{ ...commonOptions, title: "Plan du salaire" }}
      />
      <Stack.Screen
        name="subscriptions"
        options={{ ...commonOptions, title: "Paiements réguliers" }}
      />
      <Stack.Screen
        name="add-subscription"
        options={{ ...commonOptions, title: "Paiement régulier" }}
      />
      <Stack.Screen
        name="categories"
        options={{ ...commonOptions, title: "Catégories" }}
      />
      <Stack.Screen
        name="category-form"
        options={{ ...commonOptions, title: "Catégorie" }}
      />
      <Stack.Screen
        name="accounts"
        options={{ ...commonOptions, title: "Comptes" }}
      />
      <Stack.Screen
        name="account-form"
        options={{ ...commonOptions, title: "Compte" }}
      />
      <Stack.Screen
        name="transfer"
        options={{ ...commonOptions, title: "Transférer" }}
      />
      <Stack.Screen
        name="share-budget"
        options={{ ...commonOptions, title: "Partager le budget" }}
      />
      <Stack.Screen
        name="join-budget"
        options={{ ...commonOptions, title: "Rejoindre un budget" }}
      />
      <Stack.Screen
        name="settings"
        options={{ ...commonOptions, title: "Paramètres" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ ...commonOptions, title: "Notifications" }}
      />
    </Stack>
  );
}
