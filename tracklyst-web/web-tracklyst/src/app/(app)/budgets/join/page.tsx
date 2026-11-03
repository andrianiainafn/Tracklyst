"use client";

import { mdiKeyVariant } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button, Icon, cx } from "@/components/ui";
import { joinBudget, normalizeShareCode } from "@/lib/data";
import { useApp } from "@/stores/app";

export default function JoinBudgetPage() {
  const router = useRouter();
  const selectBudget = useApp((s) => s.selectBudget);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const budgetId = await joinBudget(code);
      await selectBudget(budgetId);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de rejoindre ce budget.");
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Rejoindre un budget" />
      <form onSubmit={submit} className="flex flex-col gap-4 px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-tint-muted text-tint">
            <Icon path={mdiKeyVariant} size={28} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">Rejoindre un budget</h2>
          <p className="text-sm leading-relaxed text-muted">
            Saisissez le code de 6 caractères reçu de la personne qui partage son budget.
          </p>
        </div>

        <input
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(normalizeShareCode(e.target.value));
            setError(null);
          }}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABC234"
          aria-label="Code d'invitation"
          className={cx(
            "h-[68px] w-full min-w-0 rounded-[18px] border-[1.5px] bg-surface text-center text-[30px] font-extrabold tracking-[0.3em] outline-none placeholder:text-line focus:border-tint",
            error ? "border-danger" : "border-line",
          )}
        />
        {error && <p className="text-center text-[13px] text-danger">{error}</p>}

        <Button type="submit" disabled={code.length !== 6} loading={busy}>
          Rejoindre
        </Button>
      </form>
    </>
  );
}
