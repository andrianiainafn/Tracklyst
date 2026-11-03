"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { createGoal, errorMessage } from "@/lib/data";
import { currencySymbol, money, parseAmount } from "@/lib/format";
import { useActiveBudget, useApp } from "@/stores/app";

/** Nombre de mois entre aujourd'hui et l'échéance (au moins 1). */
function monthsUntil(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const now = new Date();
  return Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
}

export default function NewGoalPage() {
  const router = useRouter();
  const refresh = useApp((s) => s.refresh);
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const [name, setName] = useState("");
  const [targetRaw, setTargetRaw] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = parseAmount(targetRaw);
  const perMonth = deadline && target > 0 ? Math.ceil(target / monthsUntil(deadline)) : 0;
  const canSave = !!budget && name.trim().length > 0 && target > 0 && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !budget) return;
    setSaving(true);
    setError(null);
    try {
      await createGoal({
        budget_id: budget.id,
        name: name.trim(),
        target_amount: target,
        deadline: deadline || null,
        description: description.trim() || null,
      });
      await refresh();
      router.replace("/goals");
    } catch (err) {
      setError(errorMessage(err, "Création impossible."));
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Nouvel objectif" />
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
        <Field label="Nom de l'objectif">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Terrain, moto, fonds d'urgence"
            maxLength={60}
            className={inputClass}
          />
        </Field>

        <Field label="Montant à atteindre">
          <div className="relative">
            <input
              inputMode="decimal"
              value={targetRaw}
              onChange={(e) => setTargetRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
              placeholder="0"
              className={cx(inputClass, "pr-14 text-[17px] font-bold")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
              {currencySymbol(currency)}
            </span>
          </div>
        </Field>

        <Field label="Échéance (optionnelle)">
          <input
            type="date"
            value={deadline}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </Field>

        {perMonth > 0 && (
          <p className="rounded-[14px] bg-tint-muted px-4 py-3 text-[14px]">
            À mettre de côté : <b>{money(perMonth, currency)}</b> par mois.
          </p>
        )}

        <Field label="Note (optionnelle)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : 300 m² à Ivato"
            className={inputClass}
          />
        </Field>

        {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

        <Button type="submit" disabled={!canSave} loading={saving}>
          Créer l&apos;objectif
        </Button>
      </form>
    </>
  );
}
