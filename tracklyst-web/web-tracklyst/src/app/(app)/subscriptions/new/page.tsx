"use client";

import { mdiCheck } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AddDefaultCategories } from "@/components/AddDefaultCategories";
import { PageHeader } from "@/components/PageHeader";
import { Button, CategoryIcon, Field, Icon, Segmented, cx, inputClass } from "@/components/ui";
import { createSubscription, errorMessage } from "@/lib/data";
import { currencySymbol, parseAmount, todayISO } from "@/lib/format";
import { useActiveBudget, useApp } from "@/stores/app";

type Frequency = "weekly" | "monthly" | "yearly";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const { categories, refresh } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  // Catégorie « Abonnements » choisie par défaut quand elle existe.
  const selectedId = categoryId ?? list.find((c) => c.name.toLowerCase() === "abonnements")?.id ?? null;
  const amount = parseAmount(amountRaw);
  const canSave = !!budget && description.trim().length > 0 && amount > 0 && !!selectedId && !!startDate && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !budget || !selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await createSubscription({
        budget_id: budget.id,
        category_id: selectedId,
        amount,
        description: description.trim(),
        frequency,
        start_date: startDate,
      });
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Création impossible."));
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Nouvel abonnement" />
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
        <Field label="Nom">
          <input
            autoFocus
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
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>

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
                    <span className={cx("line-clamp-2 break-words text-center text-[11px] leading-tight", selected ? "font-bold text-ink" : "text-muted")}>
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
          Créer l&apos;abonnement
        </Button>
      </form>
    </>
  );
}
