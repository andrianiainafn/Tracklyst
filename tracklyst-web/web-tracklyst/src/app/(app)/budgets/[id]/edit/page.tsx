"use client";

import { mdiCheck, mdiDeleteOutline, mdiLockOutline, mdiWalletOutline } from "@mdi/js";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { AccountBadge, AccountPicker } from "@/components/AccountPicker";
import { PageHeader } from "@/components/PageHeader";
import { Button, Field, Icon, Sheet, cx, inputClass } from "@/components/ui";
import { deleteBudget, errorMessage, getBudgetMembers, updateBudget } from "@/lib/data";
import { currencySymbol, money, parseAmount } from "@/lib/format";
import type { AccountKind } from "@/lib/accounts";
import { BUDGET_THEMES, resolveBudgetTheme } from "@/lib/themes";
import type { Budget } from "@/lib/types";
import { useApp } from "@/stores/app";

export default function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { budgets, loaded } = useApp();
  const budget = budgets.find((b) => b.id === id);

  return (
    <>
      <PageHeader title="Modifier le budget" />
      {budget ? (
        <BudgetEditForm key={budget.id} budget={budget} />
      ) : (
        <p className="px-4 py-12 text-center text-sm text-muted">{loaded ? "Budget introuvable." : "Chargement…"}</p>
      )}
    </>
  );
}

function BudgetEditForm({ budget }: { budget: Budget }) {
  const router = useRouter();
  const refresh = useApp((s) => s.refresh);
  const budgets = useApp((s) => s.budgets);
  const shared = budget.owner_type === "group";

  const [name, setName] = useState(budget.name);
  const [initialRaw, setInitialRaw] = useState(
    Number(budget.initial_amount ?? 0) > 0 ? String(Number(budget.initial_amount)) : "",
  );
  const [theme, setTheme] = useState(resolveBudgetTheme(budget));
  const [accountKind, setAccountKind] = useState<AccountKind | null>((budget.account_kind as AccountKind | null) ?? null);
  const [accountName, setAccountName] = useState(budget.account_name ?? "");
  const usedNames = budgets
    .filter((b) => b.id !== budget.id && b.account_kind === accountKind && b.account_name)
    .map((b) => b.account_name as string);
  // Rôle sur un budget partagé (personnel = propriétaire).
  const [role, setRole] = useState<string | null>(shared ? null : "owner");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (!shared) return;
    let cancelled = false;
    getBudgetMembers(budget.id)
      .then((list) => !cancelled && setRole(list.find((m) => m.is_me)?.role ?? "member"))
      .catch(() => !cancelled && setRole("member"));
    return () => {
      cancelled = true;
    };
  }, [budget.id, shared]);

  const canEdit = role === "owner" || role === "admin";
  const canDelete = role === "owner";
  const initial = parseAmount(initialRaw);
  const canSave = canEdit && name.trim().length > 0 && !saving;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await updateBudget(budget.id, {
        name: name.trim(),
        theme: theme.id,
        initial_amount: initial,
        account_kind: accountKind,
        account_name: accountKind ? accountName.trim() || null : null,
      });
      await refresh();
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Modification impossible."));
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteBudget(budget);
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      setConfirmOpen(false);
      setError(errorMessage(err, "Suppression impossible."));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
      <div
        className="rounded-[24px] p-5 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
      >
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/80">
          <Icon path={mdiWalletOutline} size={18} />
          <span className="truncate">{name.trim() || "Nom du budget"}</span>
        </div>
        <p className="mt-2 truncate text-[30px] font-extrabold tracking-tight">{money(initial, budget.currency)}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/70">Solde de départ · {budget.currency}</p>
          <AccountBadge budget={{ account_kind: accountKind, account_name: accountName }} className="bg-white/90! text-[#0f172a]!" />
        </div>
      </div>

      {role && !canEdit && (
        <p className="flex items-center gap-2.5 rounded-[14px] bg-surface-alt px-4 py-3 text-[13px] text-muted">
          <Icon path={mdiLockOutline} size={18} className="shrink-0" />
          Seul le propriétaire de ce budget partagé peut le modifier.
        </p>
      )}

      <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-5 disabled:opacity-60">
        <Field label="Nom">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
        </Field>

        <Field label="Où est cet argent ?">
          <AccountPicker
            kind={accountKind}
            name={accountName}
            usedNames={usedNames}
            onChange={(k, n) => {
              setAccountKind(k);
              setAccountName(n);
            }}
          />
        </Field>

        <Field label="Solde de départ" hint="L'argent qui était déjà dans ce budget avant votre première transaction.">
          <div className="relative">
            <input
              inputMode="decimal"
              value={initialRaw}
              onChange={(e) => setInitialRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
              placeholder="0"
              className={cx(inputClass, "pr-14")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
              {currencySymbol(budget.currency)}
            </span>
          </div>
        </Field>

        <Field label="Couleur">
          <div className="flex flex-wrap gap-3">
            {BUDGET_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={t.label}
                onClick={() => setTheme(t)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                  boxShadow: t.id === theme.id ? `0 0 0 2px var(--bg), 0 0 0 4px ${t.to}` : undefined,
                }}
              >
                {t.id === theme.id && <Icon path={mdiCheck} size={20} className="text-white" />}
              </button>
            ))}
          </div>
        </Field>

        <p className="text-xs text-subtle">
          Devise : {budget.currency}. Elle ne peut pas être changée : les montants enregistrés ne seraient pas convertis.
        </p>
      </fieldset>

      {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

      {canEdit && (
        <Button type="submit" disabled={!canSave} loading={saving && !confirmOpen}>
          Enregistrer
        </Button>
      )}

      {canDelete && (
        <section className="mt-3 flex flex-col gap-2.5 rounded-[18px] border border-danger/30 p-4">
          <p className="text-[13px] font-extrabold text-danger">Zone sensible</p>
          <p className="text-[13px] text-muted">
            Supprime le budget et tout son contenu (transactions, catégories, plafonds, objectifs, abonnements)
            {shared ? ", pour tous les membres" : ""}.
          </p>
          <Button type="button" variant="danger" onClick={() => setConfirmOpen(true)}>
            <Icon path={mdiDeleteOutline} size={18} />
            Supprimer ce budget
          </Button>
        </section>
      )}

      <Sheet
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmName("");
        }}
        title="Supprimer ce budget ?"
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[14px] leading-relaxed text-muted">
            « <b className="text-ink">{budget.name}</b> » et tout son contenu seront supprimés définitivement
            {shared ? ", pour tous les membres" : ""}. Pour confirmer, tapez le nom du budget.
          </p>
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={budget.name}
            aria-label="Nom du budget pour confirmer"
            className={inputClass}
          />
          <Button
            type="button"
            variant="danger"
            disabled={confirmName.trim() !== budget.name.trim()}
            loading={saving && confirmOpen}
            onClick={remove}
          >
            Supprimer définitivement
          </Button>
        </div>
      </Sheet>
    </form>
  );
}
