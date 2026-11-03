"use client";

import { mdiArrowRight, mdiChevronRight, mdiPlus, mdiSwapHorizontal } from "@mdi/js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountIcon, accountName } from "@/components/AccountChooser";
import { PageHeader } from "@/components/PageHeader";
import { Card, Icon, SectionTitle, cx } from "@/components/ui";
import { getTransfers } from "@/lib/data";
import { money, shortDate } from "@/lib/format";
import type { Transfer } from "@/lib/types";
import { useActiveBudget, useApp } from "@/stores/app";

/** Comptes du budget : solde de chacun, total, transferts récents. */
export default function AccountsPage() {
  const { accounts, accountBalances, balance, goals, hidden, loaded } = useApp();
  const budget = useActiveBudget();
  const currency = budget?.currency ?? "MGA";
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    if (!budget) return;
    let cancelled = false;
    getTransfers(budget.id)
      .then((list) => !cancelled && setTransfers(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [budget, accounts]);

  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);
  const unassigned = accountBalances.none ?? 0;
  const locked = goals.filter((g) => g.status !== "cancelled").reduce((a, g) => a + Number(g.current_amount), 0);
  const show = (n: number) => (hidden ? "•••••" : money(n, currency));
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return (
    <>
      <PageHeader title="Comptes" />
      <main className="flex flex-col gap-3.5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-1">
        <Card className="flex flex-col gap-1 p-4">
          <p className="text-xs font-semibold text-muted">Solde disponible du budget</p>
          <p className="truncate text-[28px] font-extrabold tracking-tight">{show(balance)}</p>
          {locked > 0 && (
            <p className="text-xs text-subtle">
              Total des comptes {show(balance + locked)} dont {show(locked)} mis de côté dans vos objectifs
            </p>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/accounts/transfer"
            className={cx(
              "flex h-12 items-center justify-center gap-2 rounded-[14px] bg-tint text-[15px] font-bold text-white active:opacity-80",
              active.length < 2 && "pointer-events-none opacity-40",
            )}
          >
            <Icon path={mdiSwapHorizontal} size={20} />
            Transférer
          </Link>
          <Link
            href="/accounts/new"
            className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-dashed border-tint text-[15px] font-bold text-tint active:opacity-70"
          >
            <Icon path={mdiPlus} size={20} />
            Ajouter
          </Link>
        </div>

        <SectionTitle>MES COMPTES</SectionTitle>
        {loaded && active.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucun compte. Ajoutez où se trouve votre argent : MVola, banque, espèces…
          </p>
        ) : (
          <Card className="overflow-hidden">
            {active.map((a, i) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className={cx("flex items-center gap-3 px-3.5 py-3 active:bg-surface-alt", i > 0 && "border-t border-line")}
              >
                <AccountIcon account={a} size={40} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{accountName(a)}</span>
                <span className={cx("shrink-0 text-[15px] font-extrabold", (accountBalances[a.id] ?? 0) < 0 && "text-danger")}>
                  {show(accountBalances[a.id] ?? 0)}
                </span>
                <Icon path={mdiChevronRight} size={18} className="shrink-0 text-subtle" />
              </Link>
            ))}
            {unassigned !== 0 && (
              <div className="flex items-center gap-3 border-t border-line px-3.5 py-3 text-muted">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-alt text-xs font-bold">?</span>
                <span className="min-w-0 flex-1 text-[14px] font-semibold">Sans compte</span>
                <span className="shrink-0 text-[14px] font-bold">{show(unassigned)}</span>
              </div>
            )}
          </Card>
        )}

        {archived.length > 0 && (
          <>
            <SectionTitle>ARCHIVÉS</SectionTitle>
            <Card className="overflow-hidden">
              {archived.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className={cx("flex items-center gap-3 px-3.5 py-3 opacity-60", i > 0 && "border-t border-line")}
                >
                  <AccountIcon account={a} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{accountName(a)}</span>
                  <span className="text-[13px] font-bold">{show(accountBalances[a.id] ?? 0)}</span>
                </Link>
              ))}
            </Card>
          </>
        )}

        {transfers.length > 0 && (
          <>
            <SectionTitle>DERNIERS TRANSFERTS</SectionTitle>
            <Card className="overflow-hidden">
              {transfers.slice(0, 10).map((t, i) => {
                const from = byId.get(t.from_account_id);
                const to = byId.get(t.to_account_id);
                return (
                  <div key={t.id} className={cx("flex items-center gap-3 px-3.5 py-3", i > 0 && "border-t border-line")}>
                    <div className="flex shrink-0 items-center gap-1">
                      {from && <AccountIcon account={from} size={26} />}
                      <Icon path={mdiArrowRight} size={14} className="text-subtle" />
                      {to && <AccountIcon account={to} size={26} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {from ? accountName(from) : "?"} → {to ? accountName(to) : "?"}
                      </p>
                      <p className="truncate text-[11px] text-subtle">
                        {shortDate(t.date)}
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold">{show(Number(t.amount))}</span>
                  </div>
                );
              })}
            </Card>
          </>
        )}
      </main>
    </>
  );
}
