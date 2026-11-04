"use client";

import { mdiArchiveArrowDownOutline, mdiArchiveArrowUpOutline, mdiDeleteOutline } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountPicker } from "@/components/AccountPicker";
import { Button, Field, Icon, cx, inputClass } from "@/components/ui";
import type { AccountKind } from "@/lib/accounts";
import { createAccount, deleteAccount, errorMessage, getAccountBalances, updateAccount } from "@/lib/data";
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
  // Solde actuel saisi (ce que montre MVola, le relevé bancaire…).
  const shownBalance = existing ? Math.round(accountBalances[existing.id] ?? 0) : 0;
  const [balanceRaw, setBalanceRaw] = useState(existing ? String(shownBalance) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desired = parseAmount(balanceRaw);
  const balanceChanged = existing ? balanceRaw.trim() !== "" && desired !== shownBalance : false;
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
    const base = { kind, name: name.trim() || null };
    run(async () => {
      if (!existing) return createAccount({ ...base, initial_amount: desired, budget_id: budget.id });
      if (!balanceChanged) return updateAccount(existing, base);
      // Nouveau solde : on corrige le solde de départ de l'écart, calculé sur le solde le plus récent
      // (aucune fausse dépense ni faux revenu dans les statistiques).
      const fresh = await getAccountBalances(budget.id);
      const gap = desired - (fresh[existing.id] ?? 0);
      return updateAccount(existing, { ...base, initial_amount: Number(existing.initial_amount) + gap });
    }, "Enregistrement impossible.");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
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
        label="Solde actuel du compte"
        hint={
          existing
            ? "Corrigez-le si le montant réel diffère (solde affiché par MVola, votre relevé…). Le total du budget suit ; vos dépenses et revenus ne changent pas."
            : "L'argent présent sur ce compte aujourd'hui (0 si vous allez y transférer de l'argent)."
        }
      >
        <div className="relative">
          <input
            inputMode="decimal"
            value={balanceRaw}
            onChange={(e) => setBalanceRaw(e.target.value.replace(/[^0-9.,\s-]/g, ""))}
            placeholder="0"
            className={cx(inputClass, "pr-14 text-[17px] font-bold")}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{currencySymbol(currency)}</span>
        </div>
      </Field>

      {balanceChanged && (
        <p className="rounded-[14px] bg-tint-muted px-4 py-3 text-[13px]">
          Ajustement de {desired - shownBalance > 0 ? "+" : "−"}
          {money(Math.abs(desired - shownBalance), currency)} sur ce compte (avant : {money(shownBalance, currency)}).
        </p>
      )}

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
