"use client";

import { useMemo } from "react";
import { Icon, cx, inputClass } from "@/components/ui";
import { ACCOUNT_KINDS, accountKind, accountLabel, type AccountKind } from "@/lib/accounts";

/** Choix de l'endroit où se trouve l'argent : type puis nom libre, avec suggestions. */
export function AccountPicker({
  kind,
  name,
  onChange,
  usedNames = [],
}: {
  kind: AccountKind | null;
  name: string;
  onChange: (kind: AccountKind | null, name: string) => void;
  usedNames?: string[];
}) {
  const current = accountKind(kind);
  const suggestions = useMemo(() => {
    if (!current) return [];
    const all = [...usedNames, ...current.suggestions].map((s) => s.trim()).filter(Boolean);
    return [...new Set(all)].filter((s) => s.toLowerCase() !== name.trim().toLowerCase());
  }, [current, usedNames, name]);

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {ACCOUNT_KINDS.map((k) => {
          const active = k.id === kind;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => onChange(active ? null : k.id, active ? "" : name)}
              className={cx(
                "flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-2 text-[13px] font-bold transition",
                active ? "text-ink" : "border-line bg-surface text-muted",
              )}
              style={active ? { borderColor: k.color, background: `${k.color}1f` } : undefined}
            >
              <span style={{ color: active ? k.color : undefined }}>
                <Icon path={k.icon} size={17} />
              </span>
              {k.label}
            </button>
          );
        })}
      </div>

      {current && (
        <>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: current.color }}>
              <Icon path={current.icon} size={18} />
            </span>
            <input
              value={name}
              onChange={(e) => onChange(kind, e.target.value)}
              maxLength={60}
              placeholder={current.id === "bank" ? "Nom de la banque (ex : BNI Madagascar)" : `Nom (ex : ${current.suggestions[0] ?? "Mon compte"})`}
              className={cx(inputClass, "pl-11")}
            />
          </div>
          {suggestions.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(kind, s)}
                  className="shrink-0 rounded-full bg-surface-alt px-3 py-1.5 text-[13px] font-semibold active:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Pastille « MVola », « BNI Madagascar »… ; rien si le budget n'a pas d'étiquette. */
export function AccountBadge({ budget, className }: { budget: { account_kind?: string | null; account_name?: string | null }; className?: string }) {
  const kind = accountKind(budget.account_kind);
  const label = accountLabel(budget);
  if (!kind || !label) return null;
  return (
    <span
      className={cx("inline-flex max-w-[180px] items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold", className)}
      style={{ background: `${kind.color}1f`, color: kind.color }}
    >
      <Icon path={kind.icon} size={13} className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
