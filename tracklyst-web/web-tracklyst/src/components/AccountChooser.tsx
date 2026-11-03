"use client";

import { mdiCheck } from "@mdi/js";
import { Icon, cx } from "@/components/ui";
import { accountKind } from "@/lib/accounts";
import { money } from "@/lib/format";
import { providerFor } from "@/lib/providers";
import type { Account } from "@/lib/types";

/** Logo de la marque reconnue (MVola, BNI…) ou icône du type de compte. */
export function AccountIcon({ account, size = 36 }: { account: Pick<Account, "kind" | "name">; size?: number }) {
  const provider = providerFor(account.name);
  if (provider) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={provider.logo} alt="" width={size} height={size} className="shrink-0 rounded-[10px]" style={{ width: size, height: size }} />;
  }
  const kind = accountKind(account.kind) ?? accountKind("other")!;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[10px]"
      style={{ width: size, height: size, background: `${kind.color}1f`, color: kind.color }}
    >
      <Icon path={kind.icon} size={Math.round(size * 0.55)} />
    </span>
  );
}

export const accountName = (a: Pick<Account, "kind" | "name">) => a.name?.trim() || accountKind(a.kind)?.label || "Compte";

const LAST_KEY = (budgetId: string) => `tracklyst-last-account:${budgetId}`;

/** Dernier compte utilisé sur cet appareil pour ce budget (proposé par défaut). */
export function lastAccountId(budgetId: string): string | null {
  try {
    return localStorage.getItem(LAST_KEY(budgetId));
  } catch {
    return null;
  }
}

export function rememberAccount(budgetId: string, accountId: string | null) {
  try {
    if (accountId) localStorage.setItem(LAST_KEY(budgetId), accountId);
  } catch {
    // stockage indisponible : pas de mémorisation
  }
}

/** Choix du compte (puces avec logo, nom et solde). */
export function AccountChooser({
  accounts,
  balances,
  value,
  onChange,
  currency,
  hidden,
  exclude,
}: {
  accounts: Account[];
  balances: Record<string, number>;
  value: string | null;
  onChange: (id: string) => void;
  currency: string;
  hidden?: boolean;
  exclude?: string | null;
}) {
  const list = accounts.filter((a) => !a.is_archived && a.id !== exclude);
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {list.map((a) => {
        const selected = a.id === value;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={cx(
              "relative flex min-w-[132px] shrink-0 items-center gap-2.5 rounded-[16px] border-[1.5px] bg-surface p-2.5 pr-3 text-left transition",
              selected ? "border-tint" : "border-line",
            )}
          >
            <AccountIcon account={a} size={34} />
            <span className="min-w-0">
              <span className="block max-w-[120px] truncate text-[13px] font-bold">{accountName(a)}</span>
              <span className="block text-[11px] text-muted">
                {hidden ? "•••••" : money(balances[a.id] ?? 0, currency)}
              </span>
            </span>
            {selected && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-tint text-white">
                <Icon path={mdiCheck} size={13} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
