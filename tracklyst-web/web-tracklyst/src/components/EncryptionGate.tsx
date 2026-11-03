"use client";

import {
  mdiCheck,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarked,
  mdiCloudAlertOutline,
  mdiContentCopy,
  mdiKeyChainVariant,
  mdiLockOutline,
  mdiLockReset,
  mdiShieldLockOutline,
} from "@mdi/js";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Icon, inputClass } from "@/components/ui";
import { errorMessage as message } from "@/lib/data";
import { keyManager } from "@/lib/e2ee";
import { supabase } from "@/lib/supabase";

const MIN_CODE = 6;


function useE2eeStatus() {
  return useSyncExternalStore(
    (onChange) => {
      const unsubscribe = keyManager.subscribe(onChange);
      return () => void unsubscribe();
    },
    () => keyManager.status,
    () => "idle" as const,
  );
}

/**
 * Écran plein tant que les données chiffrées ne sont pas déverrouillées :
 * activation (code + clé de secours), déverrouillage par code ou clé de secours.
 */
export function EncryptionGate({ userId }: { userId: string }) {
  const status = useE2eeStatus();
  const [recoveryToShow, setRecoveryToShow] = useState<string | null>(null);
  const [mustSetNewCode, setMustSetNewCode] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    keyManager.init(userId).catch((err) => !cancelled && setInitError(message(err, "Chargement impossible.")));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visible = status !== "unlocked" || !!recoveryToShow || mustSetNewCode;
  if (!visible || status === "idle") return null;

  let content: React.ReactNode;
  if (initError) {
    content = (
      <Step icon={mdiCloudAlertOutline} title="Connexion impossible" text={initError}>
        <Button
          onClick={() => {
            setInitError(null);
            keyManager.init(userId).catch((err) => setInitError(message(err, "Réessayez.")));
          }}
        >
          Réessayer
        </Button>
      </Step>
    );
  } else if (recoveryToShow) {
    content = <RecoveryKeyStep recoveryKey={recoveryToShow} onDone={() => setRecoveryToShow(null)} />;
  } else if (mustSetNewCode && status === "unlocked") {
    content = (
      <CodeForm
        icon={mdiLockReset}
        title="Choisissez un nouveau code"
        text="Votre clé de secours a fonctionné. Choisissez un nouveau code secret pour vos prochains déverrouillages."
        submitLabel="Enregistrer le code"
        onSubmit={async (code) => {
          await keyManager.changeCode(code);
          setMustSetNewCode(false);
        }}
      />
    );
  } else if (status === "setup") {
    content = (
      <CodeForm
        icon={mdiShieldLockOutline}
        title="Protégez vos données"
        text="Vos notes, objectifs, abonnements et noms de comptes vont être chiffrés sur cet appareil. Personne d'autre ne pourra les lire, pas même l'administrateur du serveur. Choisissez un code secret : il sera demandé une fois par appareil."
        submitLabel="Activer le chiffrement"
        onSubmit={async (code) => setRecoveryToShow(await keyManager.setup(code))}
      />
    );
  } else if (status === "locked") {
    content = <UnlockStep onRecovering={setMustSetNewCode} />;
  } else {
    content = (
      <Step icon={mdiShieldLockOutline} title="Chiffrement" text="Préparation de vos données…">
        <span className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-tint border-t-transparent" />
      </Step>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(32px+env(safe-area-inset-top))]">
        {content}
        {status !== "setup" && !recoveryToShow && !mustSetNewCode && (
          <button onClick={() => supabase.auth.signOut()} className="mx-auto text-sm font-semibold text-muted">
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Étapes ──────────────────────────────────────────────────────────────────

function Step({ icon, title, text, children }: { icon: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="mb-2 flex flex-col items-center gap-2.5 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-tint-muted text-tint">
          <Icon path={icon} size={32} />
        </span>
        <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm leading-relaxed text-muted">{text}</p>
      </div>
      {children}
    </div>
  );
}

function CodeForm({
  icon,
  title,
  text,
  submitLabel,
  onSubmit,
}: {
  icon: string;
  title: string;
  text: string;
  submitLabel: string;
  onSubmit: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mismatch = again.length > 0 && again !== code;
  const canSubmit = code.length >= MIN_CODE && again === code && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(code);
    } catch (err) {
      setError(message(err, "Une erreur est survenue."));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Step icon={icon} title={title} text={text}>
        <input
          type="password"
          autoFocus
          autoComplete="new-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={`Code secret (${MIN_CODE} caractères min.)`}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          placeholder="Confirmez le code"
          className={inputClass}
        />
        {mismatch && <p className="text-center text-[13px] text-danger">Les deux codes ne correspondent pas.</p>}
        {error && <p className="text-center text-[13px] text-danger">{error}</p>}
        <Button type="submit" disabled={!canSubmit} loading={busy}>
          {submitLabel}
        </Button>
        <p className="text-center text-xs leading-relaxed text-subtle">
          Le code ne quitte jamais l&apos;appareil : s&apos;il est perdu, seule la clé de secours permet de récupérer les
          données.
        </p>
      </Step>
    </form>
  );
}

function RecoveryKeyStep({ recoveryKey, onDone }: { recoveryKey: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <Step
      icon={mdiKeyChainVariant}
      title="Votre clé de secours"
      text="Notez-la et gardez-la en lieu sûr (papier, gestionnaire de mots de passe). Elle ne sera plus jamais affichée. Sans elle, un code oublié rend vos textes chiffrés illisibles."
    >
      <p className="select-all rounded-[18px] border border-line bg-surface-alt px-3 py-5 text-center text-[19px] font-extrabold tracking-[0.08em] tabular-nums">
        {recoveryKey}
      </p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(recoveryKey);
            setCopied(true);
          } catch {
            // Sélection manuelle possible (select-all).
          }
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-surface-alt text-[15px] font-bold"
      >
        <Icon path={copied ? mdiCheck : mdiContentCopy} size={18} />
        {copied ? "Copiée" : "Copier la clé"}
      </button>
      <button type="button" onClick={() => setSaved((v) => !v)} className="flex items-center gap-2.5 py-1 text-left text-sm font-semibold">
        <span className={saved ? "text-tint" : "text-muted"}>
          <Icon path={saved ? mdiCheckboxMarked : mdiCheckboxBlankOutline} size={22} />
        </span>
        J&apos;ai mis ma clé de secours en lieu sûr
      </button>
      <Button onClick={onDone} disabled={!saved}>
        Terminer
      </Button>
    </Step>
  );
}

function UnlockStep({ onRecovering }: { onRecovering: (pending: boolean) => void }) {
  const [mode, setMode] = useState<"code" | "recovery">("code");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "code") await keyManager.unlockWithCode(value);
      else {
        onRecovering(true);
        await keyManager.unlockWithRecovery(value);
      }
    } catch (err) {
      onRecovering(false);
      setError(message(err, "Déverrouillage impossible."));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Step
        icon={mode === "code" ? mdiLockOutline : mdiKeyChainVariant}
        title={mode === "code" ? "Déverrouillez vos données" : "Clé de secours"}
        text={
          mode === "code"
            ? "Saisissez votre code secret pour lire vos données chiffrées sur cet appareil."
            : "Saisissez les 24 caractères de votre clé de secours (les tirets sont facultatifs)."
        }
      >
        <input
          key={mode}
          type={mode === "code" ? "password" : "text"}
          autoFocus
          autoComplete={mode === "code" ? "current-password" : "off"}
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={mode === "code" ? "Code secret" : "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"}
          className={inputClass}
        />
        {error && <p className="text-center text-[13px] text-danger">{error}</p>}
        <Button type="submit" disabled={!value.trim()} loading={busy}>
          Déverrouiller
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "code" ? "recovery" : "code");
            setValue("");
            setError(null);
          }}
          className="text-center text-sm font-bold text-tint"
        >
          {mode === "code" ? "Code oublié ? Utiliser la clé de secours" : "Utiliser mon code secret"}
        </button>
      </Step>
    </form>
  );
}
