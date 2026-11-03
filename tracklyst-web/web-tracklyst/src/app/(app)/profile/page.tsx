"use client";

import { mdiLogout } from "@mdi/js";
import { useEffect, useState } from "react";
import { Card, Icon } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/stores/app";

export default function ProfilePage() {
  const { budgets, goals, subscriptions } = useApp();
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

      <p className="px-1 text-xs leading-relaxed text-subtle">
        La personnalisation des catégories et des plafonds se fait pour l&apos;instant dans l&apos;application mobile.
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
