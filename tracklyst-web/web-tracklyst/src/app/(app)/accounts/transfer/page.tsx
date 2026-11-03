"use client";

import { mdiArrowDown } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountChooser } from "@/components/AccountChooser";
import { PageHeader } from "@/components/PageHeader";
import { Button, Field, Icon, cx, inputClass } from "@/components/ui";
import { createTransfer, errorMessage } from "@/lib/data";
import { currencySymbol, money, parseAmount, todayISO } from "@/lib/format";
import { useActiveBudget, useApp } from "@/stores/app";

/** Transfert entre deux comptes du budget (ex. retrait MVola → espèces). */
export default function TransferPage() {
  const router = useRouter();
  const { accounts, accountBalances, categories, hidden, refresh } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";
  const active = accounts.filter((a) => !a.is_archived);

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [feeRaw, setFeeRaw] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = fromId ?? active[0]?.id ?? null;
  const to = toId && toId !== from ? toId : (active.find((a) => a.id !== from)?.id ?? null);
  const amount = parseAmount(amountRaw);
  const fee = parseAmount(feeRaw);
  const available = from ? (accountBalances[from] ?? 0) : 0;
  const tooMuch = amount + fee > available + 0.0001;
  // Les frais vont dans « Frais » s'il existe, sinon « Autre dépense », sinon la première catégorie de dépense.
  const expense = categories.filter((c) => c.type === "expense");
  const feeCategory =
    expense.find((c) => /^frais/i.test(c.name)) ?? expense.find((c) => /autre/i.test(c.name)) ?? expense[0] ?? null;
  const canSave = !!budget && !!from && !!to && amount > 0 && !saving && (fee === 0 || !!feeCategory);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !budget || !from || !to) return;
    setSaving(true);
    setError(null);
    try {
      await createTransfer({
        budget_id: budget.id,
        from_account_id: from,
        to_account_id: to,
        amount,
        fee,
        fee_category_id: feeCategory?.id ?? null,
        description: description.trim() || null,
        date,
      });
      await refresh();
      router.replace("/accounts");
    } catch (err) {
      setError(errorMessage(err, "Transfert impossible."));
      setSaving(false);
    }
  };

  if (active.length < 2) {
    return (
      <>
        <PageHeader title="Transférer" />
        <p className="px-6 py-12 text-center text-sm leading-relaxed text-muted">
          Il faut au moins deux comptes dans ce budget pour faire un transfert. Ajoutez-en un depuis la page Comptes.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Transférer" />
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold text-muted">Depuis</h2>
          <AccountChooser accounts={accounts} balances={accountBalances} value={from} onChange={setFromId} currency={currency} hidden={hidden} />
        </section>

        <span className="-my-2 flex justify-center text-subtle">
          <Icon path={mdiArrowDown} size={22} />
        </span>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold text-muted">Vers</h2>
          <AccountChooser
            accounts={accounts}
            balances={accountBalances}
            value={to}
            onChange={setToId}
            currency={currency}
            hidden={hidden}
            exclude={from}
          />
        </section>

        <Field label="Montant">
          <div className="relative">
            <input
              inputMode="decimal"
              autoFocus
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
              placeholder="0"
              className={cx(inputClass, "pr-14 text-[17px] font-bold")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{currencySymbol(currency)}</span>
          </div>
        </Field>

        <Field label="Frais (facultatif)" hint="Ex. frais de retrait MVola : enregistrés comme une dépense sur le compte de départ.">
          <div className="relative">
            <input
              inputMode="decimal"
              value={feeRaw}
              onChange={(e) => setFeeRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
              placeholder="0"
              className={cx(inputClass, "pr-14")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{currencySymbol(currency)}</span>
          </div>
        </Field>

        {tooMuch && amount > 0 && (
          <p className="rounded-[12px] bg-warning/15 px-3 py-2 text-[13px]">
            Le compte de départ n&apos;a que {money(available, currency)} : son solde deviendra négatif.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Note">
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex : retrait" className={inputClass} />
          </Field>
        </div>

        {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

        <Button type="submit" disabled={!canSave} loading={saving}>
          Transférer{amount > 0 ? ` ${money(amount, currency)}` : ""}
        </Button>
      </form>
    </>
  );
}
