import { Stack } from "expo-router";

// Ce fichier est OBLIGATOIRE pour qu'Expo Router enregistre (modal) comme groupe.
// Sans lui, les Stack.Screen name="(modal)" dans le root layout échouent.
export default function ModalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="add-transaction"
        options={{
          title: "Nouvelle transaction",
          presentation: "modal",
          headerShown: true,
          headerStyle: { backgroundColor: "#0D4F3C" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="add_budget"
        options={{
          title: "Nouvel budget",
          presentation: "modal",
          headerShown: true,
          headerStyle: { backgroundColor: "#0D4F3C" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="add-goal"
        options={{
          title: "Nouvel objectif",
          presentation: "modal",
          headerShown: true,
          headerStyle: { backgroundColor: "#0D4F3C" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="goal-transfer"
        options={{
          title: "Mouvement objectif",
          presentation: "modal",
          headerShown: true,
          headerStyle: { backgroundColor: "#0D4F3C" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Paramètres",
          presentation: "modal",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
