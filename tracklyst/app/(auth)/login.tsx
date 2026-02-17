import { useLogin } from "@/src/features/auth/hooks/useLogin";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type AuthMode = "password" | "magic-link";

export default function LoginScreen() {
  const router = useRouter();
  const {
    loginWithPassword,
    loginWithOAuth,
    sendMagicLink,
    magicLinkSent,
    isLoading,
    error,
    clearError,
  } = useLogin();

  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handlePasswordLogin = async () => {
    const success = await loginWithPassword(email, password);
    if (success) router.replace("/(tabs)");
  };

  const handleMagicLink = async () => {
    await sendMagicLink(email);
  };

  const handleGithub = async () => {
    const success = await loginWithOAuth("github");
    if (success) router.replace("/(tabs)");
  };

  const handleGoogle = async () => {
    const success = await loginWithOAuth("google");
    if (success) router.replace("/(tabs)");
  };

  const handleInputFocus = (field: string) => {
    setFocusedField(field);
    if (error) clearError();
  };

  if (magicLinkSent) {
    return (
      <View style={styles.centeredScreen}>
        <StatusBar style="dark" />
        <View style={styles.centeredContent}>
          <View style={styles.iconCircle}>
            <Feather name="mail" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.centeredTitle}>Vérifiez votre boîte mail</Text>
          <Text style={styles.centeredSubtitle}>
            Nous avons envoyé un lien de connexion à{"\n"}
            <Text style={styles.accentText}>{email}</Text>
          </Text>
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={16} color={COLORS.primary} />
            <Text style={styles.ghostButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Feather name="activity" size={22} color="#fff" />
          </View>
          <Text style={styles.appName}>Tracklyst</Text>
          <Text style={styles.tagline}>Vos finances, maîtrisées</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                authMode === "password" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setAuthMode("password");
                clearError();
              }}
            >
              <Feather
                name="lock"
                size={13}
                color={authMode === "password" ? COLORS.text : COLORS.muted}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  authMode === "password" && styles.modeButtonTextActive,
                ]}
              >
                Mot de passe
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                authMode === "magic-link" && styles.modeButtonActive,
              ]}
              onPress={() => {
                setAuthMode("magic-link");
                clearError();
              }}
            >
              <Feather
                name="zap"
                size={13}
                color={authMode === "magic-link" ? COLORS.text : COLORS.muted}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  authMode === "magic-link" && styles.modeButtonTextActive,
                ]}
              >
                Lien magique
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Feather
                name="alert-circle"
                size={14}
                color={COLORS.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "email" && styles.inputWrapperFocused,
              ]}
            >
              <Feather
                name="at-sign"
                size={16}
                color={COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="vous@exemple.com"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => handleInputFocus("email")}
                onBlur={() => setFocusedField(null)}
                returnKeyType={authMode === "password" ? "next" : "done"}
              />
            </View>
          </View>

          {/* Password Field */}
          {authMode === "password" && (
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Mot de passe</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Oublié ?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === "password" && styles.inputWrapperFocused,
                ]}
              >
                <Feather
                  name="lock"
                  size={16}
                  color={COLORS.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => handleInputFocus("password")}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordLogin}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Primary CTA */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isLoading && styles.primaryButtonDisabled,
            ]}
            onPress={
              authMode === "password" ? handlePasswordLogin : handleMagicLink
            }
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {authMode === "password" ? "Se connecter" : "Envoyer le lien"}
                </Text>
                <Feather
                  name="arrow-right"
                  size={16}
                  color="#fff"
                  style={{ marginLeft: 8 }}
                />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou continuer avec</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Buttons */}
          <View style={styles.oauthRow}>
            <TouchableOpacity
              style={styles.oauthButtonDark}
              onPress={handleGithub}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <FontAwesome
                name="github"
                size={16}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.oauthTextLight}>GitHub</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.oauthButtonLight}
              onPress={handleGoogle}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <FontAwesome
                name="google"
                size={16}
                color="#EA4335"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.oauthTextDark}>Google</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.footerLink}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const COLORS = {
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  primary: "#0EA5E9",
  text: "#111827",
  subtext: "#6B7280",
  muted: "#9CA3AF",
  placeholder: "#C4C9D4",
  border: "#E8EBF0",
  borderFocus: "#0EA5E9",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FCA5A5",
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },

  // ── Centered Screens (magic link sent) ──
  centeredScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  centeredContent: {
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  centeredTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  centeredSubtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: "center",
    lineHeight: 22,
  },
  accentText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  ghostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    padding: 12,
  },
  ghostButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // ── Header ──
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
    letterSpacing: 0.1,
  },

  // ── Card ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    gap: 18,
  },

  // ── Mode Toggle ──
  modeToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.muted,
  },
  modeButtonTextActive: {
    color: COLORS.text,
    fontWeight: "600",
  },

  // ── Error ──
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  // ── Form Fields ──
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.subtext,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: "#F0F9FF",
  },
  inputIcon: {
    marginLeft: 14,
    marginRight: 2,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Primary Button ──
  primaryButton: {
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // ── Divider ──
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
  },

  // ── OAuth ──
  oauthRow: {
    flexDirection: "row",
    gap: 10,
  },
  oauthButtonDark: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181B",
  },
  oauthButtonLight: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  oauthTextLight: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  oauthTextDark: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  footerLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
