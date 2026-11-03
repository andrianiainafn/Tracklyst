"use client";

import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TransactionForm } from "@/components/TransactionForm";
import { useApp } from "@/stores/app";

export default function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { transactions, loaded } = useApp();
  const tx = transactions.find((t) => t.id === id);

  return (
    <>
      <PageHeader title="Modifier la transaction" />
      {tx ? (
        <TransactionForm existing={tx} />
      ) : (
        <p className="px-4 py-12 text-center text-sm text-muted">{loaded ? "Transaction introuvable." : "Chargement…"}</p>
      )}
    </>
  );
}
