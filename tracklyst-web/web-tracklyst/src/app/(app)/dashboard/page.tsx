"use client";

import Link from "next/link";
import { useState } from "react";
import {
  mdiCheck,
  mdiChevronDown,
  mdiChevronRight,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiPlus,
  mdiTrendingDown,
  mdiTrendingUp,
} from "@mdi/js";
import { BudgetSwitcher } from "@/components/BudgetSwitcher";
import { QuickActions } from "@/components/QuickActions";
import { Card, CategoryIcon, ErrorBanner, Icon, Meter, SectionTitle, cx } from "@/components/ui";
import { confirmSubscription, errorMessage, skipSubscription } from "@/lib/data";
import { amountOnly, capitalize, currencySymbol, daysUntil, money, moneyCompact } from "@/lib/format";
import { iconForLabel } from "@/lib/icons";
import { monthlyCost } from "@/lib/schedule";
import { resolveBudgetTheme } from "@/lib/themes";
import { categoryBreakdown, currentAndPreviousKeys, dueSubscriptions, monthLimits, monthTotals } from "@/lib/stats";
import type { Subscription } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

export default function HomePage() {
  const s = useApp();
  const budget = useActiveBudget();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const currency = budget?.currency ?? "MGA";

  const keys = currentAndPreviousKeys();
  const current = monthTotals(s.transactions, keys.current);
  const previous = monthTotals(s.transactions, keys.previous);
  const limits = monthLimits(s.categories, s.transactions, keys.current);
  const breakdown = categoryBreakdown(s.transactions, keys.current);
  const due = dueSubscriptions(s.subscriptions);
  const activeSubs = s.subscriptions.filter((x) => x.is_active);
  const monthLabel = capitalize(new Date().toLocaleDateString("fr-FR", { month: "long" }));

  if (s.loaded && s.budgets.length === 0) {
    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-extrabold">Aucun budget</h1>
        <p className="text-sm text-muted">Créez votre premier budget pour commencer à suivre vos finances.</p>
        <Link href="/budgets/new" className="mt-3 inline-flex h-12 items-center rounded-[14px] bg-tint px-6 text-[15px] font-bold text-white">
          Créer un budget
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-3 px-4 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="mb-1">
        <h1 className="text-[24px] font-extrabold tracking-tight">Bonjour</h1>
        <p className="text-[13px] text-muted">Voici vos finances</p>
      </header>

      {/* Solde */}
      <Card className="p-[18px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setSwitcherOpen(true)}
            className="flex min-w-0 items-center gap-2 rounded-full bg-surface-alt py-2 pl-3 pr-2.5 text-sm font-bold active:opacity-70"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: budget ? resolveBudgetTheme(budget).to : "var(--tint)" }} />
            <span className="truncate">{budget?.name ?? "…"}</span>
            <Icon path={mdiChevronDown} size={18} className="shrink-0 text-muted" />
          </button>
          <button
            onClick={s.toggleHidden}
            aria-label={s.hidden ? "Afficher le solde" : "Masquer le solde"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-muted active:opacity-60"
          >
            <Icon path={s.hidden ? mdiEyeOffOutline : mdiEyeOutline} size={18} />
          </button>
        </div>
        <p className="text-[11px] font-bold tracking-[0.1em] text-subtle">SOLDE DISPONIBLE</p>
        <button onClick={s.toggleHidden} className="mt-1 text-left">
          <span className="text-[34px] font-extrabold tracking-[-0.03em]">
            {s.hidden ? "•••••••" : amountOnly(s.balance)}
          </span>{" "}
          <span className="text-xl font-bold text-muted">{currencySymbol(currency)}</span>
        </button>
        {s.budgets.length > 1 && (
          <p className="mt-2 text-xs text-subtle">{s.budgets.length} budgets · touchez le nom pour changer</p>
        )}
      </Card>

      {s.error && <ErrorBanner message={s.error} />}

      {/* Indicateurs du mois */}
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi label="Revenus du mois" swatch="bg-income" value={current.income} previous={previous.income} prevLabel={keys.previousLabel} upIsGood currency={currency} />
        <Kpi label="Dépenses du mois" swatch="bg-expense" value={current.expense} previous={previous.expense} prevLabel={keys.previousLabel} upIsGood={false} currency={currency} />
      </div>

      <SectionTitle>CE MOIS-CI</SectionTitle>

      {/* Abonnements */}
      <Card className="flex flex-col gap-3 p-3.5">
        {due.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold">
              {due.length === 1 ? "1 prélèvement à valider" : `${due.length} prélèvements à valider`}
            </p>
            {due.map((sub) => (
              <DueRow key={sub.id} sub={sub} currency={currency} onDone={s.refresh} />
            ))}
          </div>
        )}
        <Link href="/subscriptions/new" className="flex items-center gap-3 active:opacity-75">
          <CategoryIcon iconKey="autorenew" color="#8B5CF6" size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Abonnements</p>
            <p className="text-xs text-muted">
              {activeSubs.length === 0
                ? "Loyer, internet, électricité… Ajoutez-en un"
                : `${activeSubs.length} actif${activeSubs.length > 1 ? "s" : ""} · ${money(activeSubs.reduce((a, x) => a + monthlyCost(x), 0), currency)} / mois`}
            </p>
          </div>
          <Icon path={mdiPlus} size={20} className="shrink-0 text-subtle" />
        </Link>
      </Card>

      {/* Plafonds + épargne */}
      <Card className="flex flex-col gap-3.5 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[17px] font-extrabold tracking-tight">{monthLabel}</p>
          <p className="text-xs text-subtle">Plafonds du mois</p>
        </div>
        {limits.length === 0 ? (
          <p className="rounded-[14px] bg-surface-alt p-4 text-center text-xs leading-relaxed text-muted">
            Aucun plafond. Définissez-en (essence, courses, petites dépenses…) dans l&apos;application mobile.
          </p>
        ) : (
          limits.map((l) => {
            const color = l.status === "over" ? "var(--danger)" : l.status === "warning" ? "var(--warning)" : "var(--tint)";
            return (
              <Link
                key={l.category.id}
                href={`/transactions/new?type=expense&category=${l.category.id}`}
                className="flex items-center gap-3 active:opacity-60"
              >
                <CategoryIcon category={l.category} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">{l.category.name}</span>
                    <span className="shrink-0 text-[13px] font-bold">
                      {money(l.spent, currency)}
                      <span className="font-medium text-subtle"> / {money(l.limit, currency)}</span>
                    </span>
                  </div>
                  <Meter ratio={l.ratio} color={color} />
                  <span className={cx("text-[11px] font-semibold", l.status === "ok" ? "text-subtle" : l.status === "over" ? "text-danger" : "text-warning")}>
                    {l.status === "over" ? `Dépassé de ${money(l.spent - l.limit, currency)}` : `Reste ${money(l.limit - l.spent, currency)}`}
                  </span>
                </div>
              </Link>
            );
          })
        )}
        <Link href="/goals" className="flex items-center gap-3 border-t border-line pt-3 active:opacity-60">
          <CategoryIcon iconKey="piggy-bank-outline" color="var(--tint)" size={40} />
          <div className="flex-1">
            <p className="text-sm font-bold">Épargné ce mois-ci</p>
            {s.savedThisMonth <= 0 && <p className="text-[11px] text-subtle">Mettez de côté vers un objectif</p>}
          </div>
          <span className={cx("text-[15px] font-extrabold", s.savedThisMonth > 0 ? "text-tint" : s.savedThisMonth < 0 ? "text-danger" : "text-muted")}>
            {s.savedThisMonth > 0 ? "+" : ""}
            {money(s.savedThisMonth, currency)}
          </span>
          <Icon path={mdiChevronRight} size={18} className="text-subtle" />
        </Link>
      </Card>

      {/* Répartition */}
      <SectionTitle>ANALYSE</SectionTitle>
      <Card className="flex flex-col gap-3.5 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-extrabold tracking-tight">Où part votre argent</p>
            <p className="text-xs text-subtle">Dépenses de {monthLabel.toLowerCase()}</p>
          </div>
          <p className="text-base font-extrabold">{money(breakdown.total, currency)}</p>
        </div>
        {breakdown.rows.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-subtle">Aucune dépense ce mois-ci.</p>
        ) : (
          breakdown.rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <CategoryIcon category={{ ...r, type: "expense" }} color={r.color ?? "var(--muted)"} size={34} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 truncate text-sm font-semibold">{r.name}</span>
                  <span className="text-[13px] font-bold">{money(r.amount, currency)}</span>
                  <span className="w-9 text-right text-[11px] font-semibold text-subtle">{Math.round(r.share * 100)} %</span>
                </div>
                <Meter ratio={breakdown.rows[0].amount ? r.amount / breakdown.rows[0].amount : 0} color="var(--expense)" />
              </div>
            </div>
          ))
        )}
      </Card>

      <QuickActions />

      <BudgetSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </main>
  );
}

function Kpi({
  label,
  swatch,
  value,
  previous,
  prevLabel,
  upIsGood,
  currency,
}: {
  label: string;
  swatch: string;
  value: number;
  previous: number;
  prevLabel: string;
  upIsGood: boolean;
  currency: string;
}) {
  const has = previous > 0;
  const delta = has ? (value - previous) / previous : 0;
  const up = delta >= 0;
  const good = up === upIsGood;
  return (
    <Card className="flex flex-col gap-1.5 p-3.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <span className={cx("h-2 w-2 rounded-[2px]", swatch)} />
        {label}
      </span>
      <span className="truncate text-[21px] font-extrabold tracking-tight">{moneyCompact(value, currency)}</span>
      {has ? (
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className={cx("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold", good ? "bg-tint-muted text-tint" : "bg-danger-muted text-danger")}>
            <Icon path={up ? mdiTrendingUp : mdiTrendingDown} size={13} />
            {Math.round(Math.abs(delta) * 100)} %
          </span>
          <span className="text-subtle">vs {prevLabel}</span>
        </span>
      ) : (
        <span className="text-[11px] text-subtle">Rien en {prevLabel}</span>
      )}
    </Card>
  );
}

function DueRow({ sub, currency, onDone }: { sub: Subscription; currency: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState<"ok" | "skip" | null>(null);
  const d = daysUntil(sub.next_occurrence);
  const run = async (action: "ok" | "skip") => {
    setBusy(action);
    try {
      await (action === "ok" ? confirmSubscription(sub) : skipSubscription(sub));
      await onDone();
    } catch (err) {
      alert(errorMessage(err, "Action impossible."));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-surface-alt p-2.5">
      <CategoryIcon category={sub.category} iconKey={iconForLabel(sub.description)} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{sub.description ?? sub.category?.name ?? "Abonnement"}</p>
        <p className={cx("text-xs", d < 0 ? "text-danger" : "text-muted")}>
          {money(Number(sub.amount), currency)} · {d === 0 ? "Dû aujourd'hui" : d === -1 ? "Dû hier" : `En retard de ${-d} jours`}
        </p>
      </div>
      <button
        onClick={() => run("skip")}
        disabled={!!busy}
        className="h-[34px] min-w-16 rounded-[10px] border border-line px-2.5 text-xs font-semibold text-muted disabled:opacity-50"
      >
        {busy === "skip" ? "…" : "Ignorer"}
      </button>
      <button
        onClick={() => run("ok")}
        disabled={!!busy}
        aria-label="Valider"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-tint text-white disabled:opacity-50"
      >
        {busy === "ok" ? "…" : <Icon path={mdiCheck} size={18} />}
      </button>
    </div>
  );
}
