import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { authService } from "@/src/features/auth/services/authService";
import { useAuthStore } from "@/src/features/auth/store/authStore";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { getErrorMessage } from "@/src/utils/errors";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const RESEND_DELAY = 60;

/**
 * Confirmation de l'inscription par le code reçu par email. Le lien de l'email
 * marche aussi, mais certaines applis mail l'abîment (« Verify requires a
 * verification type ») : le code, lui, se tape directement ici.
 */
export default function VerifyEmailScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { email = "", resent, mode } = useLocalSearchParams<{ email?: string; resent?: string; mode?: string }>();
  // « login » : connexion sans mot de passe (code du lien magique).
  const isLogin = mode === "login";
  const setSession = useAuthStore((s) => s.setSession);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(resent ? "Un nouvel email vient de vous être envoyé." : null);
  const [wait, setWait] = useState(RESEND_DELAY);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const digits = code.replace(/\D/g, "");
  const canVerify = digits.length >= 6 && !busy;

  const verify = async () => {
    if (!canVerify) return;
    setBusy(true);
    setError(null);
    try {
      const session = await authService.verifySignupCode(email, digits, isLogin);
      if (session) {
        setSession(session);
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    } catch (err) {
      const msg = getErrorMessage(err, "Code invalide");
      setError(
        /expired|invalid/i.test(msg)
          ? "Code incorrect ou expiré. Vérifiez le dernier email reçu, ou demandez un nouveau code."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (wait > 0 || !email) return;
    setError(null);
    try {
      if (isLogin) await authService.sendMagicLink(email);
      else await authService.resendSignup(email);
      setInfo("Nouvel email envoyé. Utilisez le code du dernier email reçu.");
      setWait(RESEND_DELAY);
    } catch (err) {
      setError(getErrorMessage(err, "Envoi impossible, réessayez dans un instant."));
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: c.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: c.tintMuted }]}>
          <Feather name="mail" size={30} color={c.tint} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{isLogin ? "Code de connexion" : "Confirmez votre email"}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Saisissez le code reçu à{"\n"}
          <Text style={{ color: c.tint, fontWeight: "700" }}>{email}</Text>
        </Text>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 10))}
          placeholder="123456"
          placeholderTextColor={c.textSubtle}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          maxLength={10}
          onSubmitEditing={verify}
          style={[styles.code, { color: c.text, backgroundColor: c.surface, borderColor: digits.length >= 6 ? c.tint : c.border }]}
        />

        {error ? <Text style={[styles.message, { color: c.danger }]}>{error}</Text> : null}
        {!error && info ? <Text style={[styles.message, { color: c.textMuted }]}>{info}</Text> : null}

        <Button label="Confirmer" onPress={verify} disabled={!canVerify} loading={busy} style={{ alignSelf: "stretch" }} />

        <Pressable onPress={resend} disabled={wait > 0} hitSlop={8}>
          <Text style={[styles.link, { color: wait > 0 ? c.textSubtle : c.tint }]}>
            {wait > 0 ? `Renvoyer le code (${wait} s)` : "Renvoyer le code"}
          </Text>
        </Pressable>

        <Text style={[styles.hint, { color: c.textSubtle }]}>
          Pas d&apos;email ? Regardez dans les spams ou « Promotions ». Vous avez déjà cliqué sur le lien de l&apos;email ?
          Connectez-vous simplement.
        </Text>
        <Pressable onPress={() => router.replace("/login")} hitSlop={8}>
          <Text style={[styles.link, { color: c.tint }]}>Aller à la connexion</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: 28, gap: 16, alignItems: "center", maxWidth: 440, width: "100%", alignSelf: "center" },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  code: {
    alignSelf: "stretch",
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
  },
  message: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  link: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4 },
});
