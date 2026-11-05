import { Colors, Radius, Shadow } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useLogin } from "@/src/features/auth/hooks/useLogin";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";

type AuthMode = "password" | "magic-link";

export default function LoginScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const {
    loginWithPassword,
    loginWithOAuth,
    sendMagicLink,
    resetPassword,
    magicLinkSent,
    isLoading,
    error,
    clearError,
  } = useLogin();

  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordLogin = async () => {
    const success = await loginWithPassword(email, password);
    if (success) router.replace("/(tabs)");
  };

  const handleMagicLink = async () => {
    await sendMagicLink(email);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Email requis",
        'Saisissez votre email ci-dessus, puis appuyez de nouveau sur "Oublié ?".',
      );
      return;
    }
    const success = await resetPassword(email);
    if (success) {
      Alert.alert(
        "Email envoyé",
        `Un lien de réinitialisation a été envoyé à ${email}.`,
      );
    }
  };

  const handleGithub = async () => {
    const success = await loginWithOAuth("github");
    if (success) router.replace("/(tabs)");
  };

  const handleGoogle = async () => {
    const success = await loginWithOAuth("google");
    if (success) router.replace("/(tabs)");
  };

  if (magicLinkSent) {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: c.bg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={styles.centeredContent}>
          <View style={[styles.iconCircle, { backgroundColor: c.tintMuted }]}>
            <Feather name="mail" size={32} color={c.tint} />
          </View>
          <Text style={[styles.centeredTitle, { color: c.text }]}>
            Vérifiez votre boîte mail
          </Text>
          <Text style={[styles.centeredSubtitle, { color: c.textMuted }]}>
            Nous avons envoyé un lien de connexion à{"\n"}
            <Text style={{ color: c.tint, fontWeight: "600" }}>{email}</Text>
          </Text>
          <TouchableOpacity style={styles.ghostButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={16} color={c.tint} />
            <Text style={[styles.ghostButtonText, { color: c.tint }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={require("@/src/assets/images/logo.png")} style={styles.logoMark} />
          <Text style={[styles.appName, { color: c.text }]}>Tracklyst</Text>
          <Text style={[styles.tagline, { color: c.textSubtle }]}>
            Vos finances, maîtrisées
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {/* Mode Toggle */}
          <View style={[styles.modeToggle, { backgroundColor: c.surfaceAlt }]}>
            {(["password", "magic-link"] as AuthMode[]).map((mode) => {
              const active = authMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    active && { backgroundColor: c.surface, ...Shadow.sm },
                  ]}
                  onPress={() => {
                    setAuthMode(mode);
                    clearError();
                  }}
                >
                  <Feather
                    name={mode === "password" ? "lock" : "zap"}
                    size={13}
                    color={active ? c.text : c.textSubtle}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: active ? c.text : c.textSubtle },
                      active && { fontWeight: "700" },
                    ]}
                  >
                    {mode === "password" ? "Mot de passe" : "Lien magique"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: c.dangerMuted }]}>
              <Feather name="alert-circle" size={14} color={c.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            placeholder="vous@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            onFocus={clearError}
            returnKeyType={authMode === "password" ? "next" : "done"}
            icon={<Feather name="at-sign" size={16} color={c.textSubtle} />}
          />

          {authMode === "password" && (
            <View>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>
                  Mot de passe
                </Text>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={[styles.forgotLink, { color: c.tint }]}>Oublié ?</Text>
                </TouchableOpacity>
              </View>
              <Input
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                onFocus={clearError}
                returnKeyType="done"
                onSubmitEditing={handlePasswordLogin}
                icon={<Feather name="lock" size={16} color={c.textSubtle} />}
                rightElement={
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={16}
                      color={c.textSubtle}
                    />
                  </Pressable>
                }
              />
            </View>
          )}

          <Button
            label={authMode === "password" ? "Se connecter" : "Envoyer le lien"}
            onPress={authMode === "password" ? handlePasswordLogin : handleMagicLink}
            loading={isLoading}
            icon={!isLoading ? <Feather name="arrow-right" size={16} color="#fff" /> : undefined}
          />

          {/* Google / GitHub : app native uniquement (non configurés pour le web). */}
          {Platform.OS !== "web" && (
          <>
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.textSubtle }]}>
              ou continuer avec
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          <View style={styles.oauthRow}>
            <TouchableOpacity
              style={[styles.oauthButtonDark, { backgroundColor: isDark ? c.surfaceAlt : "#18181B" }]}
              onPress={handleGithub}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <FontAwesome name="github" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.oauthTextLight}>GitHub</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.oauthButtonLight, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={handleGoogle}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <FontAwesome name="google" size={16} color="#EA4335" style={{ marginRight: 8 }} />
              <Text style={[styles.oauthTextDark, { color: c.text }]}>Google</Text>
            </TouchableOpacity>
          </View>
          </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textSubtle }]}>
            Pas encore de compte ?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={[styles.footerLink, { color: c.tint }]}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },

  centeredScreen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  centeredContent: { alignItems: "center", gap: 16 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  centeredTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, textAlign: "center" },
  centeredSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  ghostButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, padding: 12 },
  ghostButtonText: { fontSize: 14, fontWeight: "600" },

  header: { alignItems: "center", marginBottom: 32 },
  logoMark: { width: 56, height: 56, marginBottom: 14 },
  appName: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { fontSize: 13, marginTop: 3, letterSpacing: 0.1 },

  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 22,
    gap: 18,
    ...Shadow.sm,
  },

  modeToggle: { flexDirection: "row", borderRadius: Radius.sm, padding: 3 },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  modeButtonText: { fontSize: 13, fontWeight: "500" },

  errorBanner: { flexDirection: "row", alignItems: "center", borderRadius: Radius.sm, padding: 12 },
  errorText: { fontSize: 13, fontWeight: "500", flex: 1 },

  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  forgotLink: { fontSize: 12, fontWeight: "600" },

  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: "500" },

  oauthRow: { flexDirection: "row", gap: 10 },
  oauthButtonDark: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  oauthButtonLight: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  oauthTextLight: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  oauthTextDark: { fontSize: 13, fontWeight: "600" },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28 },
  footerText: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: "700" },
});
