"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  mdiAccount,
  mdiAccountOutline,
  mdiFlag,
  mdiFlagOutline,
  mdiFormatListBulleted,
  mdiHome,
  mdiHomeOutline,
} from "@mdi/js";
import { Icon, cx } from "@/components/ui";
import { EncryptionGate } from "@/components/EncryptionGate";
import { keyManager } from "@/lib/e2ee";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/stores/app";

const TABS = [
  { href: "/dashboard", label: "Accueil", icon: mdiHomeOutline, active: mdiHome },
  { href: "/transactions", label: "Transactions", icon: mdiFormatListBulleted, active: mdiFormatListBulleted },
  { href: "/goals", label: "Objectifs", icon: mdiFlagOutline, active: mdiFlag },
  { href: "/profile", label: "Profil", icon: mdiAccountOutline, active: mdiAccount },
];

/** Cadre de l'app : vérifie la session, charge les données, barre d'onglets en bas. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const refresh = useApp((s) => s.refresh);
  const reset = useApp((s) => s.reset);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return router.replace("/login");
      setUserId(data.session.user.id);
      // Les lectures attendent le déverrouillage du chiffrement (EncryptionGate).
      refresh();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        // La clé de chiffrement quitte le navigateur avec la session.
        void keyManager.lock();
        reset();
        router.replace("/login");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, refresh, reset]);

  if (!userId) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-tint border-t-transparent" />
      </div>
    );
  }

  const isTab = TABS.some((t) => t.href === pathname);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md [overflow-x:clip]">
      <EncryptionGate userId={userId} />
      <div className={cx(isTab && "pb-[calc(84px+env(safe-area-inset-bottom))]")}>{children}</div>
      {isTab && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
          <div className="mx-auto flex max-w-md">
            {TABS.map((t) => {
              const active = t.href === pathname;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cx(
                    "flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-semibold",
                    active ? "text-tint" : "text-subtle",
                  )}
                >
                  <Icon path={active ? t.active : t.icon} size={24} />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
