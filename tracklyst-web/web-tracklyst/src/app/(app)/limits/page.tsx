"use client";

import { mdiClose } from "@mdi/js";
import { useMemo, useState } from "react";
import { AddDefaultCategories } from "@/components/AddDefaultCategories";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card, CategoryIcon, Icon, Meter, cx } from "@/components/ui";
import { errorMessage, updateCategoryLimit } from "@/lib/data";
import { capitalize, currencySymbol, money, monthKey, parseAmount } from "@/lib/format";
import { useActiveBudget, useApp } from "@/stores/app";

/** Plafonds du mois par catégorie de dépense : saisie et suivi. */
export default function LimitsPage() {
  const { categories, transactions, refresh } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";
  const key = monthKey(new Date());
  const monthLabel = capitalize(new Date().toLocaleDateString("fr-FR", { month: "long" }));

  // Valeurs saisies, par catégorie (absente = inchangée).
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const expense = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  const spent = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === "expense" && t.date.startsWith(key)) map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount));
    }
    return map;
  }, [transactions, key]);

  const current = (id: string, limit: number | null) =>
    draft[id] ?? (limit && Number(limit) > 0 ? String(Number(limit)) : "");

  const changes = expense.filter((c) => {
    if (!(c.id in draft)) return false;
    const next = parseAmount(draft[c.id]) || null;
    const prev = c.monthly_limit && Number(c.monthly_limit) > 0 ? Number(c.monthly_limit) : null;
    return next !== prev;
  });

  const totalLimits = expense.reduce((a, c) => a + (parseAmount(current(c.id, c.monthly_limit)) || 0), 0);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const c of changes) await updateCategoryLimit(c.id, parseAmount(draft[c.id]) || null);
      await refresh();
      setDraft({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Plafonds du mois" />
      <main className="flex flex-col gap-3.5 px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-1">
        <p className="px-1 text-[13px] leading-relaxed text-muted">
          Fixez un montant maximum par mois pour l&apos;essence, les courses, les petites dépenses… Tracklyst vous prévient
          à 80 % puis au dépassement. Laissez vide pour ne pas suivre une catégorie.
        </p>

        <Card className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">Total des plafonds · {monthLabel}</p>
            <p className="truncate text-2xl font-extrabold tracking-tight">{money(totalLimits, currency)}</p>
          </div>
        </Card>

        {expense.length === 0 ? (
          <AddDefaultCategories label="Aucune catégorie de dépense dans ce budget." />
        ) : (
          <Card className="overflow-hidden">
            {expense.map((c, i) => {
              const value = current(c.id, c.monthly_limit);
              const limit = parseAmount(value);
              const s = spent.get(c.id) ?? 0;
              const ratio = limit > 0 ? s / limit : 0;
              const color = ratio > 1 ? "var(--danger)" : ratio >= 0.8 ? "var(--warning)" : "var(--tint)";
              return (
                <div key={c.id} className={cx("flex flex-col gap-2 px-3.5 py-3", i > 0 && "border-t border-line")}>
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={c} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{c.name}</p>
                      <p className="truncate text-xs text-subtle">Dépensé : {money(s, currency)}</p>
                    </div>
                    <div className="relative w-[116px] shrink-0">
                      <input
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [c.id]: e.target.value.replace(/[^0-9.,\s]/g, "") }))}
                        placeholder="Aucun"
                        aria-label={`Plafond ${c.name}`}
                        className="h-11 w-full rounded-[12px] border border-line bg-surface pl-3 pr-9 text-right text-[15px] font-bold outline-none placeholder:font-medium placeholder:text-subtle focus:border-tint"
                      />
                      {value ? (
                        <button
                          type="button"
                          aria-label={`Retirer le plafond ${c.name}`}
                          onClick={() => setDraft((d) => ({ ...d, [c.id]: "" }))}
                          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-subtle"
                        >
                          <Icon path={mdiClose} size={16} />
                        </button>
                      ) : (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-subtle">
                          {currencySymbol(currency)}
                        </span>
                      )}
                    </div>
                  </div>
                  {limit > 0 && (
                    <div className="flex items-center gap-2 pl-[50px]">
                      <div className="flex-1">
                        <Meter ratio={ratio} color={color} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-[11px] font-bold" style={{ color }}>
                        {Math.round(ratio * 100)} %
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}
      </main>

      {/* Barre d'enregistrement */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg">
        <div className="mx-auto max-w-md">
          <Button className="w-full" onClick={save} disabled={changes.length === 0} loading={saving}>
            {saved
              ? "Plafonds enregistrés"
              : changes.length > 0
                ? `Enregistrer ${changes.length} modification${changes.length > 1 ? "s" : ""}`
                : "Aucune modification"}
          </Button>
        </div>
      </div>
    </>
  );
}
