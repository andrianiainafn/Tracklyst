"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, Segmented } from "@/components/ui";
import { errorMessage, moveGoal } from "@/lib/data";
import { currencySymbol, money, parseAmount } from "@/lib/format";
import { useActiveBudget, useApp } from "@/stores/app";

type Mode = "deposit" | "withdrawal";

export default function GoalMovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { goals, balance, loaded, refresh } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";
  const goal = goals.find((g) => g.id === id);

  const [mode, setMode] = useState<Mode>("deposit");
  const [amountRaw, setAmountRaw] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!goal) {
    return (
      <>
        <PageHeader title="Objectif" />
        <p className="px-4 py-12 text-center text-sm text-muted">{loaded ? "Objectif introuvable." : "Chargement…"}</p>
      </>
    );
  }

  const amount = parseAmount(amountRaw);
  const max = mode === "deposit" ? balance : Number(goal.current_amount);
  const tooMuch = amount > max + 0.0001;
  const canSave = amount > 0 && !tooMuch && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await moveGoal(goal, amount, mode, note.trim() || null);
      await refresh();
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Mouvement impossible."));
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={goal.name} />
      <div className="flex flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
        <Card className="flex flex-col gap-1 p-4">
          <p className="text-[13px] text-muted">
            <b className="text-ink">{money(Number(goal.current_amount), currency)}</b> épargnés sur {money(Number(goal.target_amount), currency)}
          </p>
          <p className="text-[13px] text-muted">
            Solde disponible du budget : <b className="text-ink">{money(balance, currency)}</b>
          </p>
        </Card>

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "deposit", label: "Verser" },
            { value: "withdrawal", label: "Retirer" },
          ]}
        />

        <label className="flex flex-col items-center gap-1 py-2">
          <span className="text-xs font-semibold text-muted">Montant</span>
          <span className="flex items-baseline gap-2">
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
              className="w-56 bg-transparent text-center text-[42px] font-extrabold tracking-tight outline-none placeholder:text-line"
              style={{ color: amount > 0 ? (mode === "deposit" ? "var(--tint)" : "var(--danger)") : undefined }}
            />
            <span className="text-xl font-bold text-muted">{currencySymbol(currency)}</span>
          </span>
          <span className={tooMuch ? "text-xs font-semibold text-danger" : "text-xs text-subtle"}>
            {mode === "deposit" ? "Maximum disponible" : "Maximum épargné"} : {money(max, currency)}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted">Note (optionnelle)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === "deposit" ? "Ex : épargne de novembre" : "Ex : achat matériel"}
            className="h-12 rounded-[14px] border border-line bg-surface px-4 text-[15px] outline-none placeholder:text-subtle focus:border-tint"
          />
        </label>

        {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}

        <Button onClick={submit} disabled={!canSave} loading={saving} variant={mode === "deposit" ? "primary" : "danger"}>
          {mode === "deposit" ? "Verser dans l'objectif" : "Retirer"}
          {amount > 0 ? ` · ${money(amount, currency)}` : ""}
        </Button>
      </div>
    </>
  );
}
