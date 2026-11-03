"use client";

import { mdiChevronLeft } from "@mdi/js";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";

/** En-tête des pages secondaires (formulaires) avec retour. */
export function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-bg/90 px-2 pb-2 pt-[calc(8px+env(safe-area-inset-top))] backdrop-blur-lg">
      <button
        onClick={() => (history.length > 1 ? router.back() : router.push("/dashboard"))}
        aria-label="Retour"
        className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-alt"
      >
        <Icon path={mdiChevronLeft} size={26} />
      </button>
      <h1 className="text-[17px] font-bold">{title}</h1>
    </header>
  );
}
