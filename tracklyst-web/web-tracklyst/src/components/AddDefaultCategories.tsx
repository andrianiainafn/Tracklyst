"use client";

import { mdiShapePlusOutline } from "@mdi/js";
import { useState } from "react";
import { Icon } from "@/components/ui";
import { addDefaultCategories, errorMessage } from "@/lib/data";
import { useActiveBudget, useApp } from "@/stores/app";

/** Budget sans catégorie : propose d'ajouter les catégories de base en un geste. */
export function AddDefaultCategories({ label }: { label: string }) {
  const budget = useActiveBudget();
  const { categories, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!budget) return;
    setBusy(true);
    setError(null);
    try {
      await addDefaultCategories(budget.id, categories);
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Ajout impossible."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] bg-surface-alt p-4 text-center">
      <p className="text-[13px] text-muted">{label}</p>
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-tint px-4 text-[14px] font-bold text-white disabled:opacity-50"
      >
        <Icon path={mdiShapePlusOutline} size={18} />
        {busy ? "Ajout…" : "Ajouter les catégories de base"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
