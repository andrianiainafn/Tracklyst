import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { authService } from "@/src/features/auth/services/authService";
import { useAuthStore } from "@/src/features/auth/store/authStore";
import { EncryptionGate } from "@/src/features/e2ee/EncryptionGate";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
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

/** Tap sur une notification → ouvre l'écran concerné (data.url). */
function NotificationTapHandler() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === "string") router.push(url as any);
  }, [response]);

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
      <NotificationTapHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splashScreen" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modal)" />
      </Stack>
      <EncryptionGate />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
