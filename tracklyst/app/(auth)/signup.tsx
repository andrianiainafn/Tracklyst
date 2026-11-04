import { Colors, Radius, Shadow } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useSignup } from "@/src/features/auth/hooks/useSignup";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

function getPasswordStrength(
  pwd: string,
  c: (typeof Colors)["light"],
): { bars: boolean[]; label: string; color: string } {
  const len = pwd.length;
  if (len === 0) return { bars: [false, false, false, false], label: "", color: c.border };
  if (len < 6) return { bars: [true, false, false, false], label: "Trop court", color: c.danger };
  if (len < 8) return { bars: [true, true, false, false], label: "Faible", color: "#F59E0B" };
  if (len < 12) return { bars: [true, true, true, false], label: "Bien", color: c.tint };
  return { bars: [true, true, true, true], label: "Fort", color: c.tint };
}

export default function SignupScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const {
    signup,
    signupWithOAuth,
    emailConfirmationRequired,
    isLoading,
    error,
    clearError,
  } = useSignup();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    const success = await signup(email, password, fullName);
    if (success && !emailConfirmationRequired) {
      router.replace("/(tabs)");
    }
  };

  const handleGithub = async () => {
    const success = await signupWithOAuth("github");
    if (success) router.replace("/(tabs)");
  };

  const handleGoogle = async () => {
    const success = await signupWithOAuth("google");
    if (success) router.replace("/(tabs)");
  };

  const strength = getPasswordStrength(password, c);

  if (emailConfirmationRequired) {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: c.bg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={styles.centeredContent}>
          <View style={[styles.iconCircle, { backgroundColor: c.tintMuted }]}>
            <Feather name="send" size={30} color={c.tint} />
          </View>
          <Text style={[styles.centeredTitle, { color: c.text }]}>
            Confirmez votre email
          </Text>
          <Text style={[styles.centeredSubtitle, { color: c.textMuted }]}>
            Un email de confirmation a été envoyé à{"\n"}
            <Text style={{ color: c.tint, fontWeight: "600" }}>{email}</Text>
          </Text>
          <Text style={[styles.centeredHint, { color: c.textSubtle }]}>
            Cliquez sur le lien pour activer votre compte.
          </Text>
          <Button
            label="Aller à la connexion"
            onPress={() => router.replace("/login")}
            style={{ marginTop: 8, alignSelf: "stretch" }}
          />
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={c.textMuted} />
          </TouchableOpacity>
          <Image source={require("@/src/assets/images/logo.png")} style={styles.logoMark} />
          <Text style={[styles.title, { color: c.text }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: c.textSubtle }]}>
            Commencez à suivre vos finances
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: c.dangerMuted }]}>
              <Feather name="alert-circle" size={14} color={c.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Nom complet"
            placeholder="Jean Dupont"
            autoCapitalize="words"
            autoComplete="name"
            value={fullName}
            onChangeText={setFullName}
            onFocus={clearError}
            returnKeyType="next"
            icon={<Feather name="user" size={16} color={c.textSubtle} />}
          />

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
            returnKeyType="next"
            icon={<Feather name="at-sign" size={16} color={c.textSubtle} />}
          />

          <View>
            <Input
              label="Mot de passe"
              placeholder="8 caractères minimum"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              onFocus={clearError}
              returnKeyType="done"
              onSubmitEditing={handleSignup}
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
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {strength.bars.map((filled, i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: filled ? strength.color : c.border },
                    ]}
                  />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          <Button
            label="Créer mon compte"
            onPress={handleSignup}
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

          <Text style={[styles.terms, { color: c.textSubtle }]}>
            En créant un compte, vous acceptez nos{" "}
            <Text style={[styles.termsLink, { color: c.textMuted }]}>
              Conditions d'utilisation
            </Text>{" "}
            et notre{" "}
            <Text style={[styles.termsLink, { color: c.textMuted }]}>
              Politique de confidentialité
            </Text>
            .
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.textSubtle }]}>
            Déjà un compte ?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={[styles.footerLink, { color: c.tint }]}>Se connecter</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
  },

  centeredScreen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  centeredContent: { alignItems: "center", gap: 14, alignSelf: "stretch" },
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
  centeredHint: { fontSize: 12, textAlign: "center", lineHeight: 18 },

  header: { alignItems: "center", marginBottom: 28 },
  backButton: { position: "absolute", left: 0, top: 0, padding: 8 },
  logoMark: { width: 54, height: 54, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: 3 },

  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 22,
    gap: 16,
    ...Shadow.sm,
  },

  errorBanner: { flexDirection: "row", alignItems: "center", borderRadius: Radius.sm, padding: 12 },
  errorText: { fontSize: 13, fontWeight: "500", flex: 1 },

  strengthRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  strengthBar: { height: 3, flex: 1, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: "600", marginLeft: 6, minWidth: 56 },

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

  terms: { fontSize: 11, textAlign: "center", lineHeight: 17 },
  termsLink: { fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 26 },
  footerText: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: "700" },
});
