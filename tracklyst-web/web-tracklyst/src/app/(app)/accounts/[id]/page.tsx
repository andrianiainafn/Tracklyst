"use client";

import { use } from "react";
import { AccountForm } from "@/components/AccountForm";
import { accountName } from "@/components/AccountChooser";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/stores/app";

export default function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accounts, loaded } = useApp();
  const account = accounts.find((a) => a.id === id);

  return (
    <>
      <PageHeader title={account ? accountName(account) : "Compte"} />
      {account ? (
        <AccountForm key={account.id} existing={account} />
      ) : (
        <p className="px-4 py-12 text-center text-sm text-muted">{loaded ? "Compte introuvable." : "Chargement…"}</p>
      )}
    </>
  );
}
