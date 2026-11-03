"use client";

import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useApp } from "@/stores/app";

export default function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { subscriptions, loaded } = useApp();
  const sub = subscriptions.find((s) => s.id === id);

  return (
    <>
      <PageHeader title={sub?.description ?? "Abonnement"} />
      {sub ? (
        <SubscriptionForm key={sub.id} existing={sub} />
      ) : (
        <p className="px-4 py-12 text-center text-sm text-muted">{loaded ? "Abonnement introuvable." : "Chargement…"}</p>
      )}
    </>
  );
}
