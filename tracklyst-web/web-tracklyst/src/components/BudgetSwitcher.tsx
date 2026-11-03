"use client";

import { mdiAccountMultiple, mdiCheckCircle, mdiKeyVariant, mdiPlus, mdiWalletOutline } from "@mdi/js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, Sheet, cx } from "@/components/ui";
import { getAvailableBalance } from "@/lib/data";
import { currencySymbol, money } from "@/lib/format";
import { resolveBudgetTheme } from "@/lib/themes";
import { useApp } from "@/stores/app";

/** Panneau du bas : choisir le budget actif (solde masqué selon l'œil). */
export function BudgetSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { budgets, activeBudgetId, hidden, selectBudget } = useApp();
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    Promise.all(budgets.map(async (b) => [b.id, await getAvailableBalance(b.id).catch(() => NaN)] as const)).then(
      (rows) => setBalances(Object.fromEntries(rows)),
    );
  }, [open, budgets]);

  return (
    <Sheet open={open} onClose={onClose} title="Mes budgets">
      <div className="flex flex-col gap-2">
        {budgets.map((b) => {
          const active = b.id === activeBudgetId;
          const bal = balances[b.id];
          return (
            <button
              key={b.id}
              onClick={async () => {
                onClose();
                if (!active) await selectBudget(b.id);
              }}
              className={cx(
                "flex items-center gap-3 rounded-[18px] border-[1.5px] p-3 text-left active:opacity-75",
                active ? "border-tint bg-tint-muted" : "border-transparent bg-surface-alt",
              )}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-white"
                style={{ background: resolveBudgetTheme(b).to }}
              >
                <Icon path={b.owner_type === "group" ? mdiAccountMultiple : mdiWalletOutline} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{b.name}</span>
                <span className="block text-[13px] text-muted">
                  {bal === undefined || Number.isNaN(bal)
                    ? b.currency
                    : hidden
                      ? `••••• ${currencySymbol(b.currency)}`
                      : money(bal, b.currency)}
                </span>
              </span>
              {active ? (
                <Icon path={mdiCheckCircle} size={22} className="text-tint" />
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-line" />
              )}
            </button>
          );
        })}
        <Link
          href="/budgets/new"
          onClick={onClose}
          className="mt-1 flex items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-tint py-3.5 text-[15px] font-bold text-tint active:opacity-75"
        >
          <Icon path={mdiPlus} size={20} />
          Nouveau budget
        </Link>
        <Link
          href="/budgets/join"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 py-1.5 text-[14px] font-semibold text-muted active:opacity-60"
        >
          <Icon path={mdiKeyVariant} size={16} />
          Rejoindre un budget avec un code
        </Link>
      </div>
    </Sheet>
  );
}
