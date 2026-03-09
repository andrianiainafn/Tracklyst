import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { authService } from "@/src/features/auth/services/authService";
import { useAuthStore } from "@/src/features/auth/store/authStore";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Linking } from "react-native";
import "react-native-reanimated";
import "react-native-url-polyfill/auto";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AuthGuard() {
  const { isAuthenticated, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // ✅ Chemin complet avec le groupe (auth)
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isInitialized, segments]);

  return null;
}

function DeepLinkHandler() {
  const { setSession } = useAuthStore();

  const handleUrl = async (url: string) => {
    try {
      const session = await authService.createSessionFromUrl(url);
      if (session) setSession(session);
    } catch (err) {
      console.error(
        "[DeepLinkHandler] Failed to create session from URL:",
        err,
      );
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });
    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthGuard />
      <DeepLinkHandler />
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName="splashScreen"
      >
        <Stack.Screen name="splashScreen" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modal)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
