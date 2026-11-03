"use client";

import { mdiAccountMultiplePlusOutline, mdiAutorenew, mdiChevronRight, mdiFlagOutline, mdiKeyVariant, mdiLogout, mdiSpeedometer, mdiWalletOutline } from "@mdi/js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Icon } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useActiveBudget, useApp } from "@/stores/app";

export default function ProfilePage() {
  const { budgets, goals, subscriptions } = useApp();
  const budget = useActiveBudget();
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser({
        email: data.user?.email,
        name: (data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.display_name) as string | undefined,
      }),
    );
  }, []);

  const initials = (user?.name?.trim() || user?.email || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const signOut = async () => {
    if (confirm("Voulez-vous vraiment vous déconnecter ?")) await supabase.auth.signOut();
  };

  const stats = [
    { label: "Budgets", value: budgets.length },
    { label: "Objectifs", value: goals.filter((g) => g.status !== "cancelled").length },
    { label: "Abonnements", value: subscriptions.filter((s) => s.is_active).length },
  ];

  return (
    <main className="flex flex-col gap-4 px-4 pt-[calc(16px+env(safe-area-inset-top))]">
      <h1 className="text-[26px] font-extrabold tracking-tight">Profil</h1>
      <Card className="flex flex-col gap-4 p-[18px]">
        <div className="flex items-center gap-3.5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-2xl font-extrabold text-white">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{user?.name || "Utilisateur"}</p>
            <p className="truncate text-[13px] text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="flex rounded-[14px] bg-surface-alt py-3">
          {stats.map((s, i) => (
            <div key={s.label} className={i > 0 ? "flex flex-1 flex-col items-center border-l border-line" : "flex flex-1 flex-col items-center"}>
              <span className="text-lg font-extrabold">{s.value}</span>
              <span className="text-[11px] font-semibold text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[11px] font-bold tracking-[0.12em] text-subtle">MON BUDGET</h2>
        <Card className="overflow-hidden">
          {[
            ...(budget
              ? [{ href: `/budgets/${budget.id}/edit`, icon: mdiWalletOutline, tint: "#6366F1", label: "Modifier le budget", detail: `${budget.name} · nom, couleur, suppression` }]
              : []),
            { href: "/limits", icon: mdiSpeedometer, tint: "#0EA5E9", label: "Plafonds du mois", detail: budget?.name ?? "" },
            {
              href: "/subscriptions",
              icon: mdiAutorenew,
              tint: "#8B5CF6",
              label: "Abonnements",
              detail: `${subscriptions.filter((x) => x.is_active).length} actif${subscriptions.filter((x) => x.is_active).length > 1 ? "s" : ""}`,
            },
            {
              href: "/goals",
              icon: mdiFlagOutline,
              tint: "#10B981",
              label: "Objectifs",
              detail: `${goals.filter((g) => g.status !== "cancelled").length} objectif${goals.filter((g) => g.status !== "cancelled").length > 1 ? "s" : ""}`,
            },
          ].map((r, i) => (
            <Link
              key={r.href}
              href={r.href}
              className={`flex items-center gap-3.5 px-3.5 py-3 active:bg-surface-alt ${i > 0 ? "border-t border-line" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `${r.tint}1f`, color: r.tint }}>
                <Icon path={r.icon} size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{r.label}</span>
                {r.detail && <span className="block truncate text-xs text-subtle">{r.detail}</span>}
              </span>
              <Icon path={mdiChevronRight} size={20} className="shrink-0 text-subtle" />
            </Link>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[11px] font-bold tracking-[0.12em] text-subtle">PARTAGE</h2>
        <Card className="overflow-hidden">
          {[
            {
              href: "/budgets/share",
              icon: mdiAccountMultiplePlusOutline,
              tint: "#0EA5E9",
              label: "Partager le budget",
              detail: budget ? `${budget.name}${budget.owner_type === "group" ? " · partagé" : ""}` : "",
            },
            { href: "/budgets/join", icon: mdiKeyVariant, tint: "#F59E0B", label: "Rejoindre un budget", detail: "Avec un code reçu" },
          ].map((r, i) => (
            <Link
              key={r.href}
              href={r.href}
              className={`flex items-center gap-3.5 px-3.5 py-3 active:bg-surface-alt ${i > 0 ? "border-t border-line" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `${r.tint}1f`, color: r.tint }}>
                <Icon path={r.icon} size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{r.label}</span>
                {r.detail && <span className="block truncate text-xs text-subtle">{r.detail}</span>}
              </span>
              <Icon path={mdiChevronRight} size={20} className="shrink-0 text-subtle" />
            </Link>
          ))}
        </Card>
      </section>

      <p className="px-1 text-xs leading-relaxed text-subtle">
        La personnalisation des catégories (nom, icône, couleur) se fait pour l&apos;instant dans l&apos;application mobile.
        Tout est synchronisé : c&apos;est le même compte.
      </p>

      <Card className="overflow-hidden">
        <button onClick={signOut} className="flex w-full items-center gap-3.5 px-3.5 py-3 text-danger active:bg-surface-alt">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-danger-muted">
            <Icon path={mdiLogout} size={19} />
          </span>
          <span className="text-[15px] font-semibold">Se déconnecter</span>
        </button>
      </Card>
    </main>
  );
}
