"use client";

import { mdiCheck, mdiWalletOutline } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountBadge, AccountPicker } from "@/components/AccountPicker";
import { PageHeader } from "@/components/PageHeader";
import { Button, Field, Icon, cx, inputClass } from "@/components/ui";
import { createBudget, errorMessage } from "@/lib/data";
import { currencySymbol, money, parseAmount } from "@/lib/format";
import type { AccountKind } from "@/lib/accounts";
import { BUDGET_THEMES } from "@/lib/themes";
import { useApp } from "@/stores/app";

const CURRENCIES = [
  { code: "MGA", label: "Ariary" },
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "Dollar" },
];

export default function NewBudgetPage() {
  const router = useRouter();
  const selectBudget = useApp((s) => s.selectBudget);
  const budgets = useApp((s) => s.budgets);

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("MGA");
  const [initialRaw, setInitialRaw] = useState("");
  const [theme, setTheme] = useState(BUDGET_THEMES[0]);
  const [withDefaults, setWithDefaults] = useState(true);
  const [accountKind, setAccountKind] = useState<AccountKind | null>(null);
  const [accountName, setAccountName] = useState("");
  const usedNames = budgets.filter((b) => b.account_kind === accountKind && b.account_name).map((b) => b.account_name as string);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = parseAmount(initialRaw);
  const canSave = name.trim().length > 0 && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const budget = await createBudget({
        name: name.trim(),
        currency,
        initial_amount: initial,
        theme: theme.id,
        account_kind: accountKind,
        account_name: accountKind ? accountName.trim() || null : null,
        withDefaultCategories: withDefaults,
      });
      await selectBudget(budget.id);
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Création impossible."));
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Nouveau budget" />
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
        {/* Aperçu */}
        <div
          className="rounded-[24px] p-5 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold text-white/80">
            <Icon path={mdiWalletOutline} size={18} />
            <span className="truncate">{name.trim() || "Mon nouveau budget"}</span>
          </div>
          <p className="mt-2 truncate text-[30px] font-extrabold tracking-tight">{money(initial, currency)}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/70">Solde de départ</p>
            <AccountBadge budget={{ account_kind: accountKind, account_name: accountName }} className="bg-white/90! text-[#0f172a]!" />
          </div>
        </div>

        <Field label="Nom">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Foyer, Épargne, Projet terrain"
            maxLength={60}
            className={inputClass}
          />
        </Field>

        <Field label="Où est cet argent ?" hint="MVola, compte bancaire, caisse d'épargne… Une étiquette pour savoir où se trouve l'argent.">
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

        <Field label="Solde de départ" hint="L'argent déjà disponible dans ce budget (0 si vous partez de zéro).">
          <div className="relative">
            <input
              inputMode="decimal"
              value={initialRaw}
              onChange={(e) => setInitialRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
              placeholder="0"
              className={cx(inputClass, "pr-14")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
              {currencySymbol(currency)}
            </span>
          </div>
        </Field>

        <Field label="Devise">
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.code)}
                className={cx(
                  "rounded-[14px] border-[1.5px] py-2.5 text-center transition",
                  c.code === currency ? "border-tint bg-tint-muted" : "border-line bg-surface",
                )}
              >
                <span className="block text-[15px] font-bold">{currencySymbol(c.code)}</span>
                <span className="block text-[11px] text-muted">{c.label}</span>
              </button>
            ))}
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
                className="flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-bg transition"
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

        <label className="flex items-start gap-3 rounded-[16px] bg-surface-alt p-3.5">
          <input
            type="checkbox"
            checked={withDefaults}
            onChange={(e) => setWithDefaults(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--tint)]"
          />
          <span className="text-[14px]">
            <b className="block">Ajouter les catégories de base</b>
            <span className="text-muted">Salaire, Courses, Essence, Loyer, Petites dépenses…</span>
          </span>
        </label>

        {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

        <Button type="submit" disabled={!canSave} loading={saving}>
          Créer le budget
        </Button>
      </form>
    </>
  );
}
