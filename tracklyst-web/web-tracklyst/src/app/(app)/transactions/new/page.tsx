"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { TransactionForm } from "@/components/TransactionForm";

function NewTransaction() {
  // ?type=expense&category=<id> : raccourci depuis une ligne de plafond.
  const params = useSearchParams();
  const type = params.get("type") === "income" ? "income" : "expense";
  return <TransactionForm initialType={type} initialCategoryId={params.get("category") ?? undefined} />;
}

export default function NewTransactionPage() {
  return (
    <>
      <PageHeader title="Nouvelle transaction" />
      <Suspense>
        <NewTransaction />
      </Suspense>
    </>
  );
}
