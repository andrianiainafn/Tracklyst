"use client";

import Link from "next/link";
import { mdiCalendarOutline, mdiCheckBold, mdiCheckCircle, mdiChevronRight, mdiPlus } from "@mdi/js";
import { Card, ErrorBanner, Icon, ProgressRing, SectionTitle, cx } from "@/components/ui";
import { daysUntil, money, moneyCompact } from "@/lib/format";
import { iconForLabel, iconPath } from "@/lib/icons";
import type { Goal } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

function deadlineLabel(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return "Échéance dépassée";
  if (d === 0) return "Aujourd'hui";
  if (d < 31) return `Dans ${d} jour${d > 1 ? "s" : ""}`;
  const months = Math.round(d / 30.44);
  if (months < 12) return `Dans ${months} mois`;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

const isDone = (g: Goal) => g.status === "completed" || Number(g.current_amount) >= Number(g.target_amount);

export default function GoalsPage() {
  const { goals, balance, hidden, loaded, error } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";

  const visible = goals.filter((g) => g.status !== "cancelled");
  const active = visible.filter((g) => !isDone(g));
  const completed = visible.filter(isDone);
  const saved = visible.reduce((a, g) => a + Number(g.current_amount), 0);
  const target = visible.reduce((a, g) => a + Number(g.target_amount), 0);
  const pct = target > 0 ? Math.min(saved / target, 1) : 0;

  return (
    <main className="flex flex-col gap-3.5 px-4 pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Objectifs</h1>
          <p className="text-[13px] text-muted">Épargnez pour vos projets</p>
        </div>
        <Link
          href="/goals/new"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-tint px-3.5 text-[14px] font-bold text-white active:scale-95"
        >
          <Icon path={mdiPlus} size={18} />
          Nouveau
        </Link>
      </header>

      <Card className="flex items-center gap-[18px] p-[18px]">
        <ProgressRing progress={pct} size={96} stroke={9} color="var(--tint)">
          <span className="text-xl font-extrabold tracking-tight">{Math.round(pct * 100)}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted">Épargne totale</p>
          <p className="truncate text-2xl font-extrabold tracking-tight">{money(saved, currency)}</p>
          <p className="text-xs text-subtle">sur {money(target, currency)}</p>
          <p className="mt-2.5 flex gap-3.5 text-xs text-muted">
            <span><b className="text-ink">{active.length}</b> en cours</span>
            <span><b className="text-ink">{completed.length}</b> atteint{completed.length > 1 ? "s" : ""}</span>
          </p>
        </div>
      </Card>

      {budget && (
        <div className="rounded-[14px] bg-tint-muted px-3.5 py-2.5 text-[13px]">
          Disponible à épargner <b>{hidden ? "•••••" : money(balance, currency)}</b>
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {loaded && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          Aucun objectif pour l&apos;instant. Touchez « Nouveau » pour en créer un (terrain, voyage, fonds d&apos;urgence…).
        </p>
      )}

      {active.length > 0 && <SectionTitle>EN COURS</SectionTitle>}
      {active.map((g) => <GoalCard key={g.id} goal={g} currency={currency} />)}
      {completed.length > 0 && <SectionTitle>ATTEINTS</SectionTitle>}
      {completed.map((g) => <GoalCard key={g.id} goal={g} currency={currency} />)}
    </main>
  );
}

function GoalCard({ goal, currency }: { goal: Goal; currency: string }) {
  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const ratio = target > 0 ? current / target : 0;
  const done = isDone(goal);
  const color = goal.color ?? "var(--tint)";
  const remaining = Math.max(0, target - current);
  const days = goal.deadline ? daysUntil(goal.deadline) : null;
  const overdue = days !== null && days < 0 && !done;
  const perMonth = !done && days !== null && days > 0 ? remaining / Math.max(1, Math.ceil(days / 30.44)) : null;
  const icon = (goal.icon && /^[a-z0-9-]+$/.test(goal.icon) ? goal.icon : null) ?? iconForLabel(goal.name) ?? "flag-outline";

  return (
    <Link href={`/goals/${goal.id}`} className="block active:scale-[0.99]">
      <Card className="flex flex-col gap-3 p-3.5">
        <div className="flex items-center gap-3.5">
          <ProgressRing progress={ratio} size={56} stroke={5} color={done ? "var(--tint)" : color}>
            <span style={{ color: done ? "var(--tint)" : color }}>
              <Icon path={done ? mdiCheckBold : iconPath(icon)} size={22} />
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">{goal.name}</p>
            <p className="text-[13px] text-muted">
              <b className="text-ink">{money(current, currency)}</b> / {money(target, currency)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {done ? (
                <span className="flex items-center gap-1 rounded-full bg-tint-muted px-2 py-0.5 text-[11px] font-bold text-tint">
                  <Icon path={mdiCheckCircle} size={12} /> Atteint
                </span>
              ) : (
                <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-bold">{Math.round(ratio * 100)} %</span>
              )}
              {goal.deadline && !done && (
                <span className={cx("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", overdue ? "bg-danger-muted text-danger" : "bg-surface-alt text-muted")}>
                  <Icon path={mdiCalendarOutline} size={12} /> {deadlineLabel(goal.deadline)}
                </span>
              )}
            </div>
          </div>
          <Icon path={mdiChevronRight} size={18} className="text-subtle" />
        </div>
        {!done && (
          <div className="flex justify-between border-t border-line pt-2.5 text-xs text-muted">
            <span>Reste <b className="text-ink">{money(remaining, currency)}</b></span>
            {perMonth !== null && <span>≈ <b className="text-ink">{moneyCompact(Math.ceil(perMonth), currency)}</b> / mois</span>}
          </div>
        )}
      </Card>
    </Link>
  );
}
