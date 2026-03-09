import { Stack } from "expo-router";

// Layout du groupe (auth) — pas de header, transitions simples
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
