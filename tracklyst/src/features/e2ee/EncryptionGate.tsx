import { Colors, Radius } from "@/constants/theme";
import { Button } from "@/src/components/ui/Button";
import { useAuthStore } from "@/src/features/auth/store/authStore";
import { authService } from "@/src/features/auth/services/authService";
import { getErrorMessage } from "@/src/utils/errors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { keyManager } from "./index";
import { useE2eeStatus } from "./useE2eeStatus";

const MIN_CODE = 6;
type Palette = typeof Colors.light;

/**
 * Écran plein, au-dessus de l'app, tant que les données chiffrées ne sont pas
 * déverrouillées : activation (code + clé de secours), puis déverrouillage
 * par code, ou par clé de secours avec choix d'un nouveau code.
 */
export function EncryptionGate() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { top, bottom } = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const status = useE2eeStatus();

  // Étapes locales après une action réussie.
  const [recoveryToShow, setRecoveryToShow] = useState<string | null>(null);
  const [mustSetNewCode, setMustSetNewCode] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    keyManager.init(userId).catch((err) => {
      if (!cancelled) setInitError(getErrorMessage(err, "Impossible de charger le chiffrement."));
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;
  const visible = status !== "unlocked" || !!recoveryToShow || mustSetNewCode;
  if (!visible || status === "idle") return null;

  let content: React.ReactNode;
  if (initError) {
    content = (
      <Centered c={c} icon="cloud-alert-outline" title="Connexion impossible" text={initError}>
        <Button
          label="Réessayer"
          onPress={() => {
            setInitError(null);
            keyManager.init(userId).catch((err) => setInitError(getErrorMessage(err, "Réessayez.")));
          }}
        />
      </Centered>
    );
  } else if (recoveryToShow) {
    content = <RecoveryKeyStep c={c} recoveryKey={recoveryToShow} onDone={() => setRecoveryToShow(null)} />;
  } else if (mustSetNewCode && status === "unlocked") {
    content = (
      <CodeForm
        c={c}
        icon="lock-reset"
        title="Choisissez un nouveau code"
        text="Votre clé de secours a fonctionné. Choisissez un nouveau code secret pour vos prochains déverrouillages."
        submitLabel="Enregistrer le code"
        confirm
        onSubmit={async (code) => {
          await keyManager.changeCode(code);
          setMustSetNewCode(false);
        }}
      />
    );
  } else if (status === "setup") {
    content = (
      <CodeForm
        c={c}
        icon="shield-lock-outline"
        title="Protégez vos données"
        text="Vos notes, objectifs, abonnements et noms de comptes vont être chiffrés sur cet appareil. Personne d'autre ne pourra les lire, pas même l'administrateur du serveur. Choisissez un code secret : il sera demandé une fois par appareil."
        submitLabel="Activer le chiffrement"
        confirm
        onSubmit={async (code) => setRecoveryToShow(await keyManager.setup(code))}
      />
    );
  } else if (status === "locked") {
    content = <UnlockStep c={c} onRecovering={setMustSetNewCode} />;
  } else {
    content = (
      <Centered c={c} icon="shield-lock-outline" title="Chiffrement" text="Préparation de vos données…">
        <ActivityIndicator color={c.tint} />
      </Centered>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: top + 32, paddingBottom: bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {content}
          {status !== "setup" && !recoveryToShow && !mustSetNewCode && (
            <Pressable onPress={() => authService.signOut().catch(() => {})} hitSlop={8} style={styles.signOut}>
              <Text style={[styles.link, { color: c.textMuted }]}>Se déconnecter</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Étapes ──────────────────────────────────────────────────────────────────

function Header({ c, icon, title, text }: { c: Palette; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; text: string }) {
  return (
    <View style={styles.header}>
      <View style={[styles.iconCircle, { backgroundColor: c.tintMuted }]}>
        <MaterialCommunityIcons name={icon} size={32} color={c.tint} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.text, { color: c.textMuted }]}>{text}</Text>
    </View>
  );
}

function Centered({
  c,
  icon,
  title,
  text,
  children,
}: {
  c: Palette;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.block}>
      <Header c={c} icon={icon} title={title} text={text} />
      {children}
    </View>
  );
}

function SecretInput({
  c,
  value,
  onChange,
  placeholder,
  autoFocus,
  secure = true,
  onSubmit,
}: {
  c: Palette;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  secure?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.textSubtle}
      secureTextEntry={secure}
      autoFocus={autoFocus}
      autoCapitalize={secure ? "none" : "characters"}
      autoCorrect={false}
      onSubmitEditing={onSubmit}
      style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
    />
  );
}

function CodeForm({
  c,
  icon,
  title,
  text,
  submitLabel,
  confirm,
  onSubmit,
}: {
  c: Palette;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  text: string;
  submitLabel: string;
  confirm?: boolean;
  onSubmit: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = code.length < MIN_CODE;
  const mismatch = confirm && again.length > 0 && again !== code;
  const canSubmit = !tooShort && (!confirm || again === code) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(code);
    } catch (err) {
      setError(getErrorMessage(err, "Une erreur est survenue."));
      setBusy(false);
    }
  };

  return (
    <View style={styles.block}>
      <Header c={c} icon={icon} title={title} text={text} />
      <SecretInput c={c} value={code} onChange={setCode} placeholder={`Code secret (${MIN_CODE} caractères min.)`} autoFocus />
      {confirm && <SecretInput c={c} value={again} onChange={setAgain} placeholder="Confirmez le code" onSubmit={submit} />}
      {mismatch && <Text style={[styles.error, { color: c.danger }]}>Les deux codes ne correspondent pas.</Text>}
      {error && <Text style={[styles.error, { color: c.danger }]}>{error}</Text>}
      <Button label={busy ? "Chiffrement en cours…" : submitLabel} onPress={submit} disabled={!canSubmit} loading={busy} />
      <Text style={[styles.hint, { color: c.textSubtle }]}>
        Le code ne quitte jamais l&apos;appareil : s&apos;il est perdu, seule la clé de secours permet de récupérer les données.
      </Text>
    </View>
  );
}

function RecoveryKeyStep({ c, recoveryKey, onDone }: { c: Palette; recoveryKey: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <View style={styles.block}>
      <Header
        c={c}
        icon="key-chain-variant"
        title="Votre clé de secours"
        text="Notez-la et gardez-la en lieu sûr (papier, gestionnaire de mots de passe). Elle ne sera plus jamais affichée. Sans elle, un code oublié rend vos textes chiffrés illisibles."
      />
      <Text selectable style={[styles.recovery, { color: c.text, backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        {recoveryKey}
      </Text>
      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(recoveryKey);
          setCopied(true);
        }}
        style={({ pressed }) => [styles.copy, { backgroundColor: c.surfaceAlt }, pressed && { opacity: 0.7 }]}
      >
        <MaterialCommunityIcons name={copied ? "check" : "content-copy"} size={18} color={c.text} />
        <Text style={[styles.copyText, { color: c.text }]}>{copied ? "Copiée" : "Copier la clé"}</Text>
      </Pressable>
      <Pressable onPress={() => setSaved((v) => !v)} style={styles.check}>
        <MaterialCommunityIcons
          name={saved ? "checkbox-marked" : "checkbox-blank-outline"}
          size={22}
          color={saved ? c.tint : c.textMuted}
        />
        <Text style={[styles.checkText, { color: c.text }]}>J&apos;ai mis ma clé de secours en lieu sûr</Text>
      </Pressable>
      <Button label="Terminer" onPress={onDone} disabled={!saved} />
    </View>
  );
}

function UnlockStep({ c, onRecovering }: { c: Palette; onRecovering: (pending: boolean) => void }) {
  const [mode, setMode] = useState<"code" | "recovery">("code");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "code") await keyManager.unlockWithCode(value);
      else {
        // Marqué avant : l'écran reste affiché pour choisir un nouveau code.
        onRecovering(true);
        await keyManager.unlockWithRecovery(value);
      }
    } catch (err) {
      onRecovering(false);
      setError(getErrorMessage(err, "Déverrouillage impossible."));
      setBusy(false);
    }
  };

  return (
    <View style={styles.block}>
      <Header
        c={c}
        icon={mode === "code" ? "lock-outline" : "key-chain-variant"}
        title={mode === "code" ? "Déverrouillez vos données" : "Clé de secours"}
        text={
          mode === "code"
            ? "Saisissez votre code secret pour lire vos données chiffrées sur cet appareil."
            : "Saisissez les 24 caractères de votre clé de secours (les tirets sont facultatifs)."
        }
      />
      <SecretInput
        c={c}
        value={value}
        onChange={(v) => {
          setValue(v);
          setError(null);
        }}
        placeholder={mode === "code" ? "Code secret" : "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"}
        secure={mode === "code"}
        autoFocus
        onSubmit={submit}
      />
      {error && <Text style={[styles.error, { color: c.danger }]}>{error}</Text>}
      <Button label={busy ? "Vérification…" : "Déverrouiller"} onPress={submit} disabled={!value.trim() || busy} loading={busy} />
      <Pressable
        onPress={() => {
          setMode(mode === "code" ? "recovery" : "code");
          setValue("");
          setError(null);
        }}
        hitSlop={8}
      >
        <Text style={[styles.link, { color: c.tint }]}>
          {mode === "code" ? "Code oublié ? Utiliser la clé de secours" : "Utiliser mon code secret"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 1000, elevation: 1000 },
  scroll: { paddingHorizontal: 24, flexGrow: 1, justifyContent: "center" },
  block: { gap: 14 },
  header: { alignItems: "center", gap: 10, marginBottom: 8 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, textAlign: "center" },
  text: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  input: { height: 54, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 16, fontSize: 16 },
  error: { fontSize: 13, textAlign: "center" },
  hint: { fontSize: 12, lineHeight: 17, textAlign: "center" },
  recovery: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    fontVariant: ["tabular-nums"],
  },
  copy: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: Radius.md },
  copyText: { fontSize: 15, fontWeight: "700" },
  check: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  checkText: { fontSize: 14, fontWeight: "600", flex: 1 },
  link: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  signOut: { marginTop: 28, alignSelf: "center" },
});
