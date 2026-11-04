"use client";

import { mdiArchiveArrowDownOutline, mdiArchiveArrowUpOutline, mdiDeleteOutline } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountPicker } from "@/components/AccountPicker";
import { Button, Field, Icon, cx, inputClass } from "@/components/ui";
import type { AccountKind } from "@/lib/accounts";
import { createAccount, deleteAccount, errorMessage, updateAccount } from "@/lib/data";
import { currencySymbol, money, parseAmount } from "@/lib/format";
import type { Account } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

/** Ajout ou modification d'un compte du budget actif. */
export function AccountForm({ existing }: { existing?: Account }) {
  const router = useRouter();
  const { accounts, accountBalances, transactions, refresh } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const [kind, setKind] = useState<AccountKind | null>((existing?.kind as AccountKind) ?? null);
  const [name, setName] = useState(existing?.name ?? "");
  const [initialRaw, setInitialRaw] = useState(
    existing && Number(existing.initial_amount) !== 0 ? String(Number(existing.initial_amount)) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = parseAmount(initialRaw);
  const usedNames = accounts.filter((a) => a.id !== existing?.id && a.kind === kind && a.name).map((a) => a.name as string);
  const canSave = !!budget && !!kind && !saving;
  const used = existing ? transactions.some((t) => t.account_id === existing.id) : false;

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      await refresh();
      router.replace("/accounts");
    } catch (err) {
      setError(errorMessage(err, fallback));
      setSaving(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !budget || !kind) return;
    const input = { kind, name: name.trim() || null, initial_amount: initial };
    run(
      () => (existing ? updateAccount(existing, input) : createAccount({ ...input, budget_id: budget.id })),
      "Enregistrement impossible.",
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
      {existing && (
        <p className="rounded-[14px] bg-surface-alt px-4 py-3 text-[14px]">
          Solde actuel : <b>{money(accountBalances[existing.id] ?? 0, currency)}</b>
        </p>
      )}

      <Field group label="Type et nom du compte">
        <AccountPicker
          kind={kind}
          name={name}
          usedNames={usedNames}
          onChange={(k, n) => {
            setKind(k);
            setName(n);
          }}
        />
      </Field>

      <Field
        label="Solde de départ"
        hint={
          existing
            ? "Montant présent sur ce compte avant votre première opération enregistrée. Le corriger change le solde du compte et du budget."
            : "L'argent déjà présent sur ce compte aujourd'hui (0 si vous allez y transférer de l'argent)."
        }
      >
        <div className="relative">
          <input
            inputMode="decimal"
            value={initialRaw}
            onChange={(e) => setInitialRaw(e.target.value.replace(/[^0-9.,\s-]/g, ""))}
            placeholder="0"
            className={cx(inputClass, "pr-14")}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{currencySymbol(currency)}</span>
        </div>
      </Field>

      {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

      <Button type="submit" disabled={!canSave} loading={saving}>
        {existing ? "Enregistrer" : "Ajouter le compte"}
      </Button>

      {existing && (
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => run(() => updateAccount(existing, { is_archived: !existing.is_archived }), "Modification impossible.")}
          >
            <Icon path={existing.is_archived ? mdiArchiveArrowUpOutline : mdiArchiveArrowDownOutline} size={18} />
            {existing.is_archived ? "Réactiver" : "Archiver"}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={() =>
              confirm(
                used
                  ? "Supprimer ce compte ? Ses transactions restent dans le budget, sans compte. Ses transferts sont supprimés. Préférez « Archiver » pour garder l'historique."
                  : "Supprimer ce compte ?",
              ) && run(() => deleteAccount(existing.id), "Suppression impossible.")
            }
          >
            <Icon path={mdiDeleteOutline} size={18} />
            Supprimer
          </Button>
        </div>
      )}
    </form>
  );
}
