"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { mdiCheck } from "@mdi/js";
import { AccountChooser, lastAccountId, rememberAccount } from "@/components/AccountChooser";
import { AddDefaultCategories } from "@/components/AddDefaultCategories";
import { Button, CategoryIcon, Icon, Segmented, cx } from "@/components/ui";
import { deleteTransaction, errorMessage, saveTransaction } from "@/lib/data";
import { currencySymbol, money, parseAmount, todayISO } from "@/lib/format";
import type { Transaction, TxType } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

export function TransactionForm({
  existing,
  initialType = "expense",
  initialCategoryId,
}: {
  existing?: Transaction;
  initialType?: TxType;
  initialCategoryId?: string;
}) {
  const router = useRouter();
  const { categories, refresh, accounts, accountBalances, hidden } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const [type, setType] = useState<TxType>(existing?.type ?? initialType);
  const [amountRaw, setAmountRaw] = useState(existing ? String(Number(existing.amount)) : "");
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? initialCategoryId ?? null);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [accountChoice, setAccountChoice] = useState<string | null>(existing?.account_id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  // Compte proposé : celui de la transaction, sinon le dernier utilisé, sinon le premier.
  const accountId =
    accountChoice ??
    (budget && activeAccounts.some((a) => a.id === lastAccountId(budget.id)) ? lastAccountId(budget.id) : null) ??
    activeAccounts[0]?.id ??
    null;
  const amount = parseAmount(amountRaw);
  const validCategory = list.some((c) => c.id === categoryId);
  const canSave = !!budget && amount > 0 && validCategory && !!date && !saving;
  const accent = type === "income" ? "var(--tint)" : "var(--expense)";

  const save = async () => {
    if (!canSave || !budget || !categoryId) return;
    setSaving(true);
    setError(null);
    try {
      await saveTransaction(
        {
          budget_id: budget.id,
          account_id: accountId,
          category_id: categoryId,
          amount,
          type,
          description: description.trim() || null,
          date,
        },
        existing?.id,
      );
      rememberAccount(budget.id, accountId);
      await refresh();
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !confirm("Supprimer cette transaction ? Cette action est irréversible.")) return;
    setSaving(true);
    try {
      await deleteTransaction(existing.id);
      await refresh();
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Suppression impossible."));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
      <Segmented
        value={type}
        onChange={(t) => {
          setType(t);
          setCategoryId(null);
        }}
        options={[
          { value: "expense", label: "Dépense" },
          { value: "income", label: "Revenu" },
        ]}
      />

      {/* Montant */}
      <label className="flex flex-col items-center gap-1 py-2">
        <span className="text-xs font-semibold text-muted">Montant</span>
        <span className="flex items-baseline gap-2">
          <input
            autoFocus={!existing}
            inputMode="decimal"
            placeholder="0"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
            className="w-56 bg-transparent text-center text-[42px] font-extrabold tracking-tight outline-none placeholder:text-line"
            style={{ color: amount > 0 ? accent : undefined }}
          />
          <span className="text-xl font-bold text-muted">{currencySymbol(currency)}</span>
        </span>
      </label>

      {/* Compte */}
      {activeAccounts.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold text-muted">
            {type === "income" ? "Reçu sur le compte" : "Payé avec le compte"}
          </h2>
          <AccountChooser
            accounts={accounts}
            balances={accountBalances}
            value={accountId}
            onChange={setAccountChoice}
            currency={currency}
            hidden={hidden}
          />
        </section>
      )}

      {/* Catégorie */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold text-muted">Catégorie</h2>
        {list.length === 0 ? (
          <AddDefaultCategories label={`Aucune catégorie de ${type === "income" ? "revenu" : "dépense"} dans ce budget.`} />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {list.map((c) => {
              const selected = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cx(
                    "relative flex flex-col items-center gap-1.5 rounded-[14px] border-[1.5px] px-1 py-2.5 transition",
                    selected ? "bg-surface" : "border-transparent bg-surface",
                  )}
                  style={selected ? { borderColor: c.color ?? accent } : undefined}
                >
                  <CategoryIcon category={c} size={40} filled={selected} />
                  <span className={cx("line-clamp-2 text-center text-[11px] leading-tight", selected ? "font-bold text-ink" : "text-muted")}>
                    {c.name}
                  </span>
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white" style={{ background: c.color ?? accent }}>
                      <Icon path={mdiCheck} size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">Description</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
          placeholder="Ex : plein d'essence, courses au marché…"
          className="h-12 rounded-[14px] border border-line bg-surface px-4 text-[15px] outline-none placeholder:text-subtle focus:border-tint"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">Date</span>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 rounded-[14px] border border-line bg-surface px-4 text-[15px] outline-none focus:border-tint"
        />
      </label>

      {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

      <Button onClick={save} disabled={!canSave} loading={saving}>
        {existing ? "Enregistrer" : amount > 0 ? `Ajouter · ${money(amount, currency)}` : "Ajouter"}
      </Button>
      {existing && (
        <Button variant="danger" onClick={remove} disabled={saving}>
          Supprimer
        </Button>
      )}
    </div>
  );
}
