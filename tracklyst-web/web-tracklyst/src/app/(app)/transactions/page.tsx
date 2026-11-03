"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { mdiAutorenew, mdiChevronLeft, mdiChevronRight, mdiCloseCircle, mdiMagnify, mdiPlus } from "@mdi/js";
import { Card, CategoryIcon, ErrorBanner, Icon, Meter, Segmented, cx } from "@/components/ui";
import { capitalize, dayLabel, money, monthKey, shortDate } from "@/lib/format";
import { monthTotals } from "@/lib/stats";
import type { Transaction } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

type Filter = "all" | "income" | "expense";

export default function TransactionsPage() {
  const { transactions, loaded, error } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const key = monthKey(month);
  const canNext = key < monthKey(new Date());
  const shift = (d: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + d, 1));
  const monthName = month.toLocaleDateString("fr-FR", { month: "long" });

  const monthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(key)), [transactions, key]);
  const totals = monthTotals(transactions, key);
  const net = totals.income - totals.expense;
  const ratio = totals.income > 0 ? totals.expense / totals.income : 0;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Transaction[]>();
    for (const t of monthTx) {
      if (filter !== "all" && t.type !== filter) continue;
      if (q && !t.description?.toLowerCase().includes(q) && !t.category?.name.toLowerCase().includes(q)) continue;
      map.set(t.date, [...(map.get(t.date) ?? []), t]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items,
        net: items.reduce((a, t) => a + (t.type === "income" ? 1 : -1) * Number(t.amount), 0),
      }));
  }, [monthTx, filter, query]);

  return (
    <main className="flex flex-col gap-3.5 px-4 pt-[calc(16px+env(safe-area-inset-top))]">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight">Transactions</h1>
        <p className="text-[13px] text-muted">
          {monthTx.length} opération{monthTx.length !== 1 ? "s" : ""} en {monthName}
        </p>
      </header>

      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="Mois précédent" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt active:opacity-60">
          <Icon path={mdiChevronLeft} />
        </button>
        <p className="text-base font-bold">{capitalize(month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</p>
        <button
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="Mois suivant"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt active:opacity-60 disabled:opacity-35"
        >
          <Icon path={mdiChevronRight} />
        </button>
      </div>

      <Card className="flex flex-col gap-3.5 p-[18px]">
        <div className="flex items-center">
          <Stat label="Revenus" swatch="bg-income" value={money(totals.income, currency)} />
          <span className="mx-2.5 h-8 w-px bg-line" />
          <Stat label="Dépenses" swatch="bg-expense" value={money(totals.expense, currency)} />
          <span className="mx-2.5 h-8 w-px bg-line" />
          <Stat label="Solde" value={`${net > 0 ? "+" : ""}${money(net, currency)}`} danger={net < 0} />
        </div>
        {totals.income > 0 && (
          <div className="flex flex-col gap-1.5">
            <Meter ratio={ratio} color={ratio > 1 ? "var(--danger)" : ratio >= 0.8 ? "var(--warning)" : "var(--tint)"} />
            <p className="text-xs text-muted">
              {ratio > 1
                ? `Dépenses supérieures aux revenus de ${Math.round((ratio - 1) * 100)} %`
                : `${Math.round(ratio * 100)} % des revenus dépensés`}
            </p>
          </div>
        )}
      </Card>

      <label className="flex items-center gap-2 rounded-[14px] border border-line bg-surface px-3">
        <Icon path={mdiMagnify} size={18} className="text-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une opération ou une catégorie"
          className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Effacer">
            <Icon path={mdiCloseCircle} size={18} className="text-subtle" />
          </button>
        )}
      </label>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tout" },
          { value: "income", label: "Revenus" },
          { value: "expense", label: "Dépenses" },
        ]}
      />

      {error && <ErrorBanner message={error} />}

      {!loaded ? (
        <div className="flex justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-tint border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-bold">{query ? "Aucun résultat" : `Aucune transaction en ${monthName}`}</p>
          <p className="mt-1 text-sm text-muted">{query ? "Essayez un autre mot-clé." : "Appuyez sur + pour ajouter une opération."}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.date} className="flex flex-col gap-2">
            <div className="flex justify-between px-1">
              <span className="text-[13px] font-bold text-muted">{dayLabel(g.date)}</span>
              <span className="text-xs font-semibold text-subtle">
                {g.net > 0 ? "+" : g.net < 0 ? "−" : ""}
                {money(Math.abs(g.net), currency)}
              </span>
            </div>
            <Card className="overflow-hidden">
              {g.items.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className={cx("flex items-center gap-3 px-3.5 py-3 active:bg-surface-alt", i > 0 && "border-t border-line")}
                >
                  <CategoryIcon category={{ ...t.category, type: t.type }} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.description || t.category?.name || "Transaction"}</span>
                    <span className="flex items-center gap-1 text-xs text-subtle">
                      <span className="truncate">{t.description && t.category?.name ? t.category.name : shortDate(t.date)}</span>
                      {t.is_recurring && <Icon path={mdiAutorenew} size={12} />}
                    </span>
                  </span>
                  <span className={cx("text-sm font-bold", t.type === "income" ? "text-tint" : "text-ink")}>
                    {t.type === "income" ? "+" : "−"}
                    {money(Number(t.amount), currency)}
                  </span>
                </Link>
              ))}
            </Card>
          </section>
        ))
      )}

      <Link
        href="/transactions/new"
        aria-label="Nouvelle transaction"
        className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-tint text-white shadow-lg active:scale-95 sm:right-[calc(50%-208px)]"
      >
        <Icon path={mdiPlus} size={26} />
      </Link>
    </main>
  );
}

function Stat({ label, value, swatch, danger }: { label: string; value: string; swatch?: string; danger?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {swatch && <span className={cx("h-2 w-2 rounded-[2px]", swatch)} />}
        {label}
      </span>
      <span className={cx("truncate text-[15px] font-extrabold tracking-tight", danger && "text-danger")}>{value}</span>
    </div>
  );
}
