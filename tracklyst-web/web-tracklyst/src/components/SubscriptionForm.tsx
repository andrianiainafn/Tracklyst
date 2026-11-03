"use client";

import { mdiCheck, mdiDeleteOutline, mdiPauseCircleOutline, mdiPlayCircleOutline } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AccountChooser } from "@/components/AccountChooser";
import { AddDefaultCategories } from "@/components/AddDefaultCategories";
import { Button, CategoryIcon, Field, Icon, Segmented, cx, inputClass } from "@/components/ui";
import { createSubscription, deleteSubscription, errorMessage, updateSubscription } from "@/lib/data";
import { currencySymbol, parseAmount, todayISO } from "@/lib/format";
import type { Subscription } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

type Frequency = "weekly" | "monthly" | "yearly";

/** Création ou modification d'un abonnement (prélèvement récurrent). */
export function SubscriptionForm({ existing }: { existing?: Subscription }) {
  const router = useRouter();
  const { categories, refresh, accounts, accountBalances, hidden } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const [description, setDescription] = useState(existing?.description ?? "");
  const [amountRaw, setAmountRaw] = useState(existing ? String(Number(existing.amount)) : "");
  const [frequency, setFrequency] = useState<Frequency>(
    existing && existing.frequency !== "daily" ? existing.frequency : "monthly",
  );
  const [nextDate, setNextDate] = useState(existing?.next_occurrence ?? todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [accountChoice, setAccountChoice] = useState<string | null>(existing?.account_id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  // Catégorie « Abonnements » choisie par défaut quand elle existe.
  const selectedId = categoryId ?? list.find((c) => c.name.toLowerCase() === "abonnements")?.id ?? null;
  const amount = parseAmount(amountRaw);
  const accountId = accountChoice ?? accounts.find((a) => !a.is_archived)?.id ?? null;
  const canSave = !!budget && description.trim().length > 0 && amount > 0 && !!selectedId && !!nextDate && !saving;

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      await refresh();
      router.replace("/subscriptions");
    } catch (err) {
      setError(errorMessage(err, fallback));
      setSaving(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !budget || !selectedId) return;
    const input = { category_id: selectedId, account_id: accountId, amount, description: description.trim(), frequency };
    run(
      () =>
        existing
          ? updateSubscription(existing.id, { ...input, next_occurrence: nextDate })
          : createSubscription({ ...input, budget_id: budget.id, start_date: nextDate }),
      "Enregistrement impossible.",
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
      {existing && !existing.is_active && (
        <p className="rounded-[14px] bg-surface-alt px-4 py-3 text-[13px] text-muted">
          Cet abonnement est en pause : aucun rappel ni prélèvement à valider.
        </p>
      )}

      <Field label="Nom">
        <input
          autoFocus={!existing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : Internet, Loyer, Électricité"
          maxLength={60}
          className={inputClass}
        />
      </Field>

      <Field label="Montant">
        <div className="relative">
          <input
            inputMode="decimal"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
            placeholder="0"
            className={cx(inputClass, "pr-14 text-[17px] font-bold")}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
            {currencySymbol(currency)}
          </span>
        </div>
      </Field>

      <Field label="Fréquence">
        <Segmented
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: "weekly", label: "Semaine" },
            { value: "monthly", label: "Mois" },
            { value: "yearly", label: "Année" },
          ]}
        />
      </Field>

      <Field label="Prochain prélèvement" hint="Vous serez rappelé ce jour-là pour le valider ou l'ignorer.">
        <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={inputClass} />
      </Field>

      {accounts.some((a) => !a.is_archived) && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold text-muted">Prélevé sur le compte</h2>
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

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold text-muted">Catégorie</h2>
        {list.length === 0 ? (
          <AddDefaultCategories label="Aucune catégorie de dépense dans ce budget." />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {list.map((c) => {
              const selected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className="relative flex min-w-0 flex-col items-center gap-1.5 rounded-[14px] border-[1.5px] border-transparent bg-surface px-1 py-2.5"
                  style={selected ? { borderColor: c.color ?? "var(--tint)" } : undefined}
                >
                  <CategoryIcon category={c} size={40} filled={selected} />
                  <span
                    className={cx(
                      "line-clamp-2 break-words text-center text-[11px] leading-tight",
                      selected ? "font-bold text-ink" : "text-muted",
                    )}
                  >
                    {c.name}
                  </span>
                  {selected && (
                    <span
                      className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white"
                      style={{ background: c.color ?? "var(--tint)" }}
                    >
                      <Icon path={mdiCheck} size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

      <Button type="submit" disabled={!canSave} loading={saving}>
        {existing ? "Enregistrer" : "Créer l'abonnement"}
      </Button>

      {existing && (
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              run(() => updateSubscription(existing.id, { is_active: !existing.is_active }), "Modification impossible.")
            }
          >
            <Icon path={existing.is_active ? mdiPauseCircleOutline : mdiPlayCircleOutline} size={18} />
            {existing.is_active ? "Pause" : "Reprendre"}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={() =>
              confirm(`Supprimer « ${existing.description ?? "cet abonnement"} » ? Les dépenses déjà validées restent.`) &&
              run(() => deleteSubscription(existing.id), "Suppression impossible.")
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
