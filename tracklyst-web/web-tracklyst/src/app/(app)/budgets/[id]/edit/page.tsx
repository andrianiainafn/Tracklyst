"use client";

import { mdiCheck, mdiDeleteOutline, mdiLockOutline, mdiWalletOutline } from "@mdi/js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { AccountIcon, accountName } from "@/components/AccountChooser";
import { PageHeader } from "@/components/PageHeader";
import { Button, Field, Icon, Sheet, inputClass } from "@/components/ui";
import { deleteBudget, errorMessage, getBudgetMembers, updateBudget } from "@/lib/data";
import { money } from "@/lib/format";
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
  const shared = budget.owner_type === "group";

  const [name, setName] = useState(budget.name);
  const [theme, setTheme] = useState(resolveBudgetTheme(budget));
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
  const { accounts, accountBalances, activeBudgetId } = useApp();
  // Comptes chargés seulement pour le budget affiché.
  const budgetAccounts = activeBudgetId === budget.id ? accounts.filter((a) => !a.is_archived) : [];
  const total = budgetAccounts.reduce((sum, a) => sum + (accountBalances[a.id] ?? 0), 0);
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
        <p className="mt-2 text-xs text-white/70">
          {budgetAccounts.length} compte{budgetAccounts.length > 1 ? "s" : ""} · {budget.currency}
        </p>
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

        <Field group label="Couleur">
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

      {activeBudgetId === budget.id && (
        <Link href="/accounts" className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-4 active:opacity-80">
          <span className="flex items-center justify-between">
            <span className="text-[15px] font-bold">Comptes du budget</span>
            <span className="text-[13px] font-bold text-tint">Gérer</span>
          </span>
          {budgetAccounts.map((a) => (
            <span key={a.id} className="flex items-center gap-3">
              <AccountIcon account={a} size={30} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{accountName(a)}</span>
              <span className="text-[13px] font-bold">{money(accountBalances[a.id] ?? 0, budget.currency)}</span>
            </span>
          ))}
          <span className="flex items-center justify-between border-t border-line pt-2.5 text-[13px] text-muted">
            Total des comptes <b className="text-ink">{money(total, budget.currency)}</b>
          </span>
        </Link>
      )}

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
