"use client";

import {
  mdiAccountMultiplePlusOutline,
  mdiAccountRemoveOutline,
  mdiCheck,
  mdiContentCopy,
  mdiLogout,
  mdiShareVariantOutline,
} from "@mdi/js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, Icon, cx } from "@/components/ui";
import { getBudgetMembers, getShareCode, leaveBudget, removeBudgetMember, type BudgetMember } from "@/lib/data";
import { useActiveBudget, useApp } from "@/stores/app";

const ROLE_LABEL: Record<BudgetMember["role"], string> = { owner: "Propriétaire", admin: "Admin", member: "Membre" };

export default function ShareBudgetPage() {
  const router = useRouter();
  const budget = useActiveBudget();
  const refresh = useApp((s) => s.refresh);

  const [members, setMembers] = useState<BudgetMember[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shared = budget?.owner_type === "group";
  const me = members.find((m) => m.is_me);
  const isOwner = !shared || me?.role === "owner";
  const loading = shared && loadedFor !== budget?.id;

  useEffect(() => {
    if (!budget || budget.owner_type !== "group") return;
    let cancelled = false;
    getBudgetMembers(budget.id)
      .then(async (list) => {
        const ownCode = list.find((m) => m.is_me)?.role === "owner" ? await getShareCode(budget.id) : null;
        if (cancelled) return;
        setMembers(list);
        setCode(ownCode);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Chargement impossible."))
      .finally(() => !cancelled && setLoadedFor(budget.id));
    return () => {
      cancelled = true;
    };
  }, [budget]);

  if (!budget) {
    return (
      <>
        <PageHeader title="Partager le budget" />
        <p className="px-4 py-12 text-center text-sm text-muted">Aucun budget sélectionné.</p>
      </>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const startSharing = () =>
    run(async () => {
      const newCode = await getShareCode(budget.id);
      await refresh();
      setCode(newCode);
      setMembers(await getBudgetMembers(budget.id));
    });

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible : sélectionnez le code pour le copier.");
    }
  };

  const message = code
    ? `Rejoins mon budget « ${budget.name} » sur Tracklyst avec le code ${code} (Profil → Rejoindre un budget).`
    : "";
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <PageHeader title="Partager le budget" />
      <div className="flex flex-col gap-4 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint-muted text-tint">
            <Icon path={mdiAccountMultiplePlusOutline} size={30} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">{budget.name}</h2>
          <p className="px-2 text-sm leading-relaxed text-muted">
            Les membres voient et gèrent ce budget avec vous : dépenses, revenus, plafonds, objectifs et rappels.
          </p>
        </div>

        {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

        {loading ? (
          <span className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-tint border-t-transparent" />
        ) : !shared && !code ? (
          <Card className="flex flex-col gap-3.5 p-4">
            {[
              "Générez un code de 6 caractères.",
              "Envoyez-le à la personne (WhatsApp, SMS…).",
              "Elle le saisit dans Profil → Rejoindre un budget.",
            ].map((t, i) => (
              <div key={t} className="flex items-center gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-tint text-[13px] font-extrabold text-white">
                  {i + 1}
                </span>
                <span className="text-[14px]">{t}</span>
              </div>
            ))}
            <Button onClick={startSharing} loading={busy}>
              Générer le code de partage
            </Button>
          </Card>
        ) : (
          <>
            {isOwner && code && (
              <Card className="flex flex-col gap-3.5 p-4">
                <p className="text-[11px] font-bold tracking-[0.12em] text-subtle">CODE D&apos;INVITATION</p>
                <button
                  onClick={copy}
                  className="select-all rounded-[18px] border border-line bg-surface-alt py-5 text-center text-[34px] font-extrabold tracking-[0.3em] tabular-nums"
                >
                  {code}
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={copy} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-tint text-[15px] font-bold text-white">
                    <Icon path={copied ? mdiCheck : mdiContentCopy} size={18} />
                    {copied ? "Copié" : "Copier"}
                  </button>
                  <button
                    onClick={() => (canNativeShare ? navigator.share({ text: message }).catch(() => {}) : copy())}
                    className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-surface-alt text-[15px] font-bold"
                  >
                    <Icon path={mdiShareVariantOutline} size={18} />
                    Envoyer
                  </button>
                </div>
                <button
                  onClick={() =>
                    confirm("L'ancien code ne fonctionnera plus. Les membres actuels restent. Continuer ?") &&
                    run(async () => setCode(await getShareCode(budget.id, true)))
                  }
                  className="text-[13px] font-semibold text-muted underline"
                >
                  Générer un nouveau code
                </button>
              </Card>
            )}

            <p className="mt-1 text-[11px] font-bold tracking-[0.12em] text-subtle">MEMBRES · {members.length}</p>
            <Card className="overflow-hidden">
              {members.map((m, i) => (
                <div key={m.user_id} className={cx("flex items-center gap-3 px-3.5 py-3", i > 0 && "border-t border-line")}>
                  <span
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white"
                    style={{ background: m.role === "owner" ? "var(--tint)" : "#8B5CF6" }}
                  >
                    {(m.display_name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">
                      {m.display_name}
                      {m.is_me ? " (vous)" : ""}
                    </p>
                    <p className="truncate text-xs text-subtle">
                      {ROLE_LABEL[m.role]}
                      {m.email ? ` · ${m.email}` : ""}
                    </p>
                  </div>
                  {isOwner && !m.is_me && (
                    <button
                      aria-label={`Retirer ${m.display_name}`}
                      onClick={() =>
                        confirm(`Retirer ${m.display_name} ? Il n'aura plus accès à « ${budget.name} ».`) &&
                        run(async () => {
                          await removeBudgetMember(budget.id, m.user_id);
                          setMembers((list) => list.filter((x) => x.user_id !== m.user_id));
                        })
                      }
                      className="shrink-0 text-danger"
                    >
                      <Icon path={mdiAccountRemoveOutline} size={22} />
                    </button>
                  )}
                </div>
              ))}
            </Card>

            {!isOwner && (
              <Button
                variant="danger"
                loading={busy}
                onClick={() =>
                  confirm(`Quitter « ${budget.name} » ? Vous n'y aurez plus accès.`) &&
                  run(async () => {
                    await leaveBudget(budget.id);
                    await refresh();
                    router.replace("/dashboard");
                  })
                }
              >
                <Icon path={mdiLogout} size={18} />
                Quitter ce budget
              </Button>
            )}
          </>
        )}
      </div>
    </>
  );
}
