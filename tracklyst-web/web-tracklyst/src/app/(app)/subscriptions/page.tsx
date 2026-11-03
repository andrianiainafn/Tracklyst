"use client";

import { mdiChevronRight, mdiPlus } from "@mdi/js";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, CategoryIcon, Icon, SectionTitle, cx } from "@/components/ui";
import { daysUntil, money, shortDate } from "@/lib/format";
import { monthlyCost } from "@/lib/schedule";
import type { Subscription } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

const FREQ: Record<Subscription["frequency"], string> = {
  daily: "jour",
  weekly: "semaine",
  monthly: "mois",
  yearly: "an",
};

function dueLabel(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return "En retard";
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  if (d < 8) return `Dans ${d} jours`;
  return shortDate(iso);
}

export default function SubscriptionsPage() {
  const { subscriptions, loaded } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const active = subscriptions.filter((s) => s.is_active);
  const paused = subscriptions.filter((s) => !s.is_active);
  const perMonth = active.reduce((a, s) => a + monthlyCost(s), 0);

  return (
    <>
      <PageHeader title="Abonnements" />
      <main className="flex flex-col gap-3.5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-1">
        <Card className="flex items-center gap-3.5 p-4">
          <CategoryIcon iconKey="autorenew" color="#8B5CF6" size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">Total par mois</p>
            <p className="truncate text-2xl font-extrabold tracking-tight">{money(perMonth, currency)}</p>
            <p className="text-xs text-subtle">
              {active.length} actif{active.length > 1 ? "s" : ""}
              {paused.length > 0 ? ` · ${paused.length} en pause` : ""}
            </p>
          </div>
        </Card>

        <Link
          href="/subscriptions/new"
          className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-dashed border-tint text-[15px] font-bold text-tint active:opacity-70"
        >
          <Icon path={mdiPlus} size={20} />
          Nouvel abonnement
        </Link>

        {loaded && subscriptions.length === 0 && (
          <p className="py-8 text-center text-sm leading-relaxed text-muted">
            Aucun abonnement. Ajoutez vos prélèvements réguliers (loyer, internet, électricité…) pour être rappelé le jour J.
          </p>
        )}

        {active.length > 0 && <SectionTitle>ACTIFS</SectionTitle>}
        {active.length > 0 && <SubList list={active} currency={currency} />}
        {paused.length > 0 && <SectionTitle>EN PAUSE</SectionTitle>}
        {paused.length > 0 && <SubList list={paused} currency={currency} />}
      </main>
    </>
  );
}

function SubList({ list, currency }: { list: Subscription[]; currency: string }) {
  return (
    <Card className="overflow-hidden">
      {list.map((s, i) => {
        const late = s.is_active && daysUntil(s.next_occurrence) < 0;
        return (
          <Link
            key={s.id}
            href={`/subscriptions/${s.id}`}
            className={cx("flex items-center gap-3 px-3.5 py-3 active:bg-surface-alt", i > 0 && "border-t border-line", !s.is_active && "opacity-60")}
          >
            <CategoryIcon category={s.category} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{s.description ?? s.category?.name ?? "Abonnement"}</p>
              <p className={cx("truncate text-xs", late ? "font-semibold text-danger" : "text-subtle")}>
                {s.is_active ? dueLabel(s.next_occurrence) : "En pause"} · par {FREQ[s.frequency]}
              </p>
            </div>
            <span className="shrink-0 text-[14px] font-bold">{money(Number(s.amount), currency)}</span>
            <Icon path={mdiChevronRight} size={18} className="shrink-0 text-subtle" />
          </Link>
        );
      })}
    </Card>
  );
}
