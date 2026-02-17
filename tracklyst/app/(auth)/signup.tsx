import { useSignup } from "@/src/features/auth/hooks/useSignup";
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
  warn: "#F59E0B",
  success: "#10B981",
};

function getPasswordStrength(pwd: string): {
  bars: boolean[];
  label: string;
  color: string;
} {
  const len = pwd.length;
  if (len === 0)
    return {
      bars: [false, false, false, false],
      label: "",
      color: COLORS.border,
    };
  if (len < 6)
    return {
      bars: [true, false, false, false],
      label: "Trop court",
      color: COLORS.danger,
    };
  if (len < 8)
    return {
      bars: [true, true, false, false],
      label: "Faible",
      color: COLORS.warn,
    };
  if (len < 12)
    return {
      bars: [true, true, true, false],
      label: "Bien",
      color: COLORS.primary,
    };
  return {
    bars: [true, true, true, true],
    label: "Fort",
    color: COLORS.success,
  };
}

export default function SignupScreen() {
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const handleFocus = (field: string) => {
    setFocusedField(field);
    clearError();
  };

  const strength = getPasswordStrength(password);

  if (emailConfirmationRequired) {
    return (
      <View style={styles.centeredScreen}>
        <StatusBar style="dark" />
        <View style={styles.centeredContent}>
          <View style={styles.iconCircle}>
            <Feather name="send" size={30} color={COLORS.primary} />
          </View>
          <Text style={styles.centeredTitle}>Confirmez votre email</Text>
          <Text style={styles.centeredSubtitle}>
            Un email de confirmation a été envoyé à{"\n"}
            <Text style={styles.accentText}>{email}</Text>
          </Text>
          <Text style={styles.centeredHint}>
            Cliquez sur le lien pour activer votre compte.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.primaryButtonText}>Aller à la connexion</Text>
            <Feather
              name="arrow-right"
              size={16}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={COLORS.subtext} />
          </TouchableOpacity>
          <View style={styles.logoMark}>
            <Feather name="activity" size={22} color="#fff" />
          </View>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Commencez à suivre vos finances</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
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

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nom complet</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "name" && styles.inputWrapperFocused,
              ]}
            >
              <Feather
                name="user"
                size={16}
                color={COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Jean Dupont"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="words"
                autoComplete="name"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => handleFocus("name")}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Email */}
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
                onFocus={() => handleFocus("email")}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mot de passe</Text>
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
                placeholder="8 caractères minimum"
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => handleFocus("password")}
                onBlur={() => setFocusedField(null)}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
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

            {/* Strength Bars */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {strength.bars.map((filled, i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor: filled
                          ? strength.color
                          : COLORS.border,
                      },
                    ]}
                  />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isLoading && styles.primaryButtonDisabled,
            ]}
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Créer mon compte</Text>
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

          {/* OAuth */}
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

          {/* Terms */}
          <Text style={styles.terms}>
            En créant un compte, vous acceptez nos{" "}
            <Text style={styles.termsLink}>Conditions d'utilisation</Text> et
            notre{" "}
            <Text style={styles.termsLink}>Politique de confidentialité</Text>.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.footerLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // ── Centered Screen ──
  centeredScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  centeredContent: {
    alignItems: "center",
    gap: 14,
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
  centeredHint: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 18,
  },

  // ── Header ──
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    padding: 8,
  },
  logoMark: {
    width: 54,
    height: 54,
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
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
    gap: 16,
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

  // ── Fields ──
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

  // ── Password Strength ──
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  strengthBar: {
    height: 3,
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 6,
    minWidth: 56,
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

  // ── Terms ──
  terms: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 17,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: "500",
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
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
