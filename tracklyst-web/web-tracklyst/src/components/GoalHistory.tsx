"use client";

import { mdiArrowDownBold, mdiArrowUpBold, mdiDeleteOutline, mdiPencilOutline } from "@mdi/js";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, Field, Icon, SectionTitle, Sheet, cx, inputClass } from "@/components/ui";
import { deleteGoalMovement, getGoalMovements, updateGoalMovement, type GoalMovement } from "@/lib/data";
import { currencySymbol, money, parseAmount, shortDate } from "@/lib/format";
import type { Account, Goal } from "@/lib/types";
import { useApp } from "@/stores/app";
import { AccountChooser, AccountIcon, accountName } from "@/components/AccountChooser";

/** Historique des versements / retraits d'un objectif, modifiables. */
export function GoalHistory({
  goal,
  currency,
  version,
  onChanged,
}: {
  goal: Goal;
  currency: string;
  /** Change à chaque nouveau mouvement pour recharger la liste. */
  version: number;
  onChanged: () => Promise<void>;
}) {
  const { accounts, accountBalances, hidden } = useApp();
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const [movements, setMovements] = useState<GoalMovement[]>([]);
  const [editing, setEditing] = useState<GoalMovement | null>(null);

  const reload = useCallback(() => getGoalMovements(goal).then(setMovements).catch(() => {}), [goal]);

  useEffect(() => {
    void reload();
  }, [reload, version]);

  if (movements.length === 0) return null;

  return (
    <>
      <SectionTitle>HISTORIQUE</SectionTitle>
      <Card className="overflow-hidden">
        {movements.map((m, i) => {
          const deposit = m.type === "deposit";
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setEditing(m)}
              className={cx("flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-alt", i > 0 && "border-t border-line")}
            >
              <span
                className={cx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  deposit ? "bg-tint-muted text-tint" : "bg-danger-muted text-danger",
                )}
              >
                <Icon path={deposit ? mdiArrowDownBold : mdiArrowUpBold} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{m.description || (deposit ? "Versement" : "Retrait")}</span>
                <span className="flex items-center gap-1 text-xs text-subtle">
                  {shortDate(m.date)}
                  {m.account_id && accountById.get(m.account_id) && (
                    <>
                      <span>·</span>
                      <AccountIcon account={accountById.get(m.account_id)!} size={14} />
                      <span className="truncate">{accountName(accountById.get(m.account_id)!)}</span>
                    </>
                  )}
                </span>
              </span>
              <span className={cx("shrink-0 text-[14px] font-bold", deposit ? "text-tint" : "text-danger")}>
                {deposit ? "+" : "−"}
                {money(Number(m.amount), currency)}
              </span>
              <Icon path={mdiPencilOutline} size={16} className="shrink-0 text-subtle" />
            </button>
          );
        })}
      </Card>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.type === "withdrawal" ? "Modifier le retrait" : "Modifier le versement"}>
        {editing && (
          <MovementForm
            key={editing.id}
            movement={editing}
            currency={currency}
            accounts={accounts}
            balances={accountBalances}
            hidden={hidden}
            onDone={async () => {
              setEditing(null);
              await onChanged();
              await reload();
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function MovementForm({
  movement,
  currency,
  accounts,
  balances,
  hidden,
  onDone,
}: {
  movement: GoalMovement;
  currency: string;
  accounts: Account[];
  balances: Record<string, number>;
  hidden: boolean;
  onDone: () => Promise<void>;
}) {
  const [accountId, setAccountId] = useState<string | null>(movement.account_id);
  const [amountRaw, setAmountRaw] = useState(String(Number(movement.amount)));
  const [note, setNote] = useState(movement.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = parseAmount(amountRaw);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Montant">
        <div className="relative">
          <input
            inputMode="decimal"
            autoFocus
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.,\s]/g, ""))}
            className={cx(inputClass, "pr-14 text-[17px] font-bold")}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{currencySymbol(currency)}</span>
        </div>
      </Field>
      {accounts.some((a) => !a.is_archived) && (
        <Field group label={movement.type === "deposit" ? "Depuis le compte" : "Vers le compte"}>
          <AccountChooser accounts={accounts} balances={balances} value={accountId} onChange={setAccountId} currency={currency} hidden={hidden} />
        </Field>
      )}
      <Field label="Note">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultative" className={inputClass} />
      </Field>
      <p className="text-xs text-subtle">
        Le montant épargné de l&apos;objectif et le solde du budget sont recalculés automatiquement.
      </p>
      {error && <p className="rounded-[12px] bg-danger-muted px-3 py-2 text-[13px] text-danger">{error}</p>}
      <Button
        disabled={amount <= 0}
        loading={busy}
        onClick={() => run(() => updateGoalMovement(movement, { amount, description: note.trim() || null, account_id: accountId }))}
      >
        Enregistrer · {money(amount, currency)}
      </Button>
      <Button
        variant="danger"
        disabled={busy}
        onClick={() =>
          confirm(`Supprimer ce ${movement.type === "withdrawal" ? "retrait" : "versement"} de ${money(Number(movement.amount), currency)} ?`) &&
          run(() => deleteGoalMovement(movement.id))
        }
      >
        <Icon path={mdiDeleteOutline} size={18} />
        Supprimer
      </Button>
    </div>
  );
}
