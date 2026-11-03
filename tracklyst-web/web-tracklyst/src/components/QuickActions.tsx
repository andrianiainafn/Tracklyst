"use client";

import {
  mdiArrowBottomLeft,
  mdiArrowTopRight,
  mdiAutorenew,
  mdiChevronRight,
  mdiFlagPlusOutline,
  mdiPlus,
  mdiWalletPlusOutline,
} from "@mdi/js";
import Link from "next/link";
import { useState } from "react";
import { Icon, Sheet, cx } from "@/components/ui";

const SECONDARY = [
  { href: "/budgets/new", icon: mdiWalletPlusOutline, tint: "#0EA5E9", label: "Nouveau budget", detail: "Séparer foyer, épargne, projet…" },
  { href: "/goals/new", icon: mdiFlagPlusOutline, tint: "#10B981", label: "Nouvel objectif", detail: "Terrain, moto, fonds d'urgence…" },
  { href: "/subscriptions/new", icon: mdiAutorenew, tint: "#8B5CF6", label: "Abonnement", detail: "Loyer, internet, électricité…" },
];

/** Bouton + de l'accueil : dépense, revenu, budget, objectif, abonnement (comme l'app mobile). */
export function QuickActions() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ajouter"
        className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-tint text-white shadow-lg transition active:scale-95 sm:right-[max(20px,calc(50%-208px))]"
      >
        <Icon path={mdiPlus} size={28} />
      </button>

      <Sheet open={open} onClose={close} title="Ajouter">
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { type: "expense", label: "Dépense", icon: mdiArrowTopRight, color: "var(--expense)" },
              { type: "income", label: "Revenu", icon: mdiArrowBottomLeft, color: "var(--income)" },
            ].map((a) => (
              <Link
                key={a.type}
                href={`/transactions/new?type=${a.type}`}
                onClick={close}
                className="flex flex-col items-center gap-2.5 rounded-[18px] border py-5 active:opacity-75"
                style={{
                  background: `color-mix(in srgb, ${a.color} 10%, transparent)`,
                  borderColor: `color-mix(in srgb, ${a.color} 25%, transparent)`,
                }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: a.color }}>
                  <Icon path={a.icon} size={22} />
                </span>
                <span className="text-[15px] font-bold">{a.label}</span>
              </Link>
            ))}
          </div>

          <div className="overflow-hidden rounded-[18px] bg-surface-alt">
            {SECONDARY.map((a, i) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={close}
                className={cx("flex items-center gap-3.5 px-3.5 py-3 active:opacity-70", i > 0 && "border-t border-line")}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: `${a.tint}1f`, color: a.tint }}
                >
                  <Icon path={a.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{a.label}</span>
                  <span className="block truncate text-xs text-subtle">{a.detail}</span>
                </span>
                <Icon path={mdiChevronRight} size={20} className="shrink-0 text-subtle" />
              </Link>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  );
}
