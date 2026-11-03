"use client";

import { PageHeader } from "@/components/PageHeader";
import { SubscriptionForm } from "@/components/SubscriptionForm";

export default function NewSubscriptionPage() {
  return (
    <>
      <PageHeader title="Nouvel abonnement" />
      <SubscriptionForm />
    </>
  );
}
