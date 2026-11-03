"use client";

import { mdiDeleteOutline } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Icon, cx, inputClass } from "@/components/ui";
import { createGoal, deleteGoal, errorMessage, updateGoal } from "@/lib/data";
import { currencySymbol, money, parseAmount, todayISO } from "@/lib/format";
import type { Goal } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

/** Nombre de mois entre aujourd'hui et l'échéance (au moins 1). */
function monthsUntil(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const now = new Date();
  return Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
}

/** Création ou modification d'un objectif d'épargne. */
export function GoalForm({ existing }: { existing?: Goal }) {
  const router = useRouter();
  const refresh = useApp((s) => s.refresh);
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const [name, setName] = useState(existing?.name ?? "");
  const [targetRaw, setTargetRaw] = useState(existing ? String(Number(existing.target_amount)) : "");
  const [deadline, setDeadline] = useState(existing?.deadline ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = parseAmount(targetRaw);
  const saved = Number(existing?.current_amount ?? 0);
  const remaining = Math.max(0, target - saved);
  const perMonth = deadline && remaining > 0 ? Math.ceil(remaining / monthsUntil(deadline)) : 0;
  const canSave = !!budget && name.trim().length > 0 && target > 0 && !saving;

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      await refresh();
      router.replace("/goals");
    } catch (err) {
      setError(errorMessage(err, fallback));
      setSaving(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !budget) return;
    const input = {
      name: name.trim(),
      target_amount: target,
      deadline: deadline || null,
      description: description.trim() || null,
    };
    run(
      () => (existing ? updateGoal(existing.id, input) : createGoal({ ...input, budget_id: budget.id })),
      "Enregistrement impossible.",
    );
  };

  const remove = () => {
    if (!existing) return;
    const msg =
      saved > 0
        ? `Supprimer « ${existing.name} » ? Les ${money(saved, currency)} épargnés redeviendront disponibles dans le budget.`
        : `Supprimer « ${existing.name} » ? Cette action est irréversible.`;
    if (confirm(msg)) run(() => deleteGoal(existing.id), "Suppression impossible.");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
      <Field label="Nom de l'objectif">
        <input
          autoFocus={!existing}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Terrain, moto, fonds d'urgence"
          maxLength={60}
          className={inputClass}
        />
      </Field>

      <Field
        label="Montant à atteindre"
        hint={existing && saved > 0 ? `Déjà épargné : ${money(saved, currency)}` : undefined}
      >
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
        <div className="flex gap-2">
          <input
            type="date"
            value={deadline}
            min={todayISO()}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
          {deadline && (
            <button
              type="button"
              onClick={() => setDeadline("")}
              className="shrink-0 rounded-[14px] bg-surface-alt px-3 text-[13px] font-semibold text-muted"
            >
              Retirer
            </button>
          )}
        </div>
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
        {existing ? "Enregistrer" : "Créer l'objectif"}
      </Button>

      {existing && (
        <Button type="button" variant="danger" disabled={saving} onClick={remove}>
          <Icon path={mdiDeleteOutline} size={18} />
          Supprimer l&apos;objectif
        </Button>
      )}
    </form>
  );
}
