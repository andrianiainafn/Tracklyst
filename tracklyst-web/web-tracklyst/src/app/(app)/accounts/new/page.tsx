"use client";

import { AccountForm } from "@/components/AccountForm";
import { PageHeader } from "@/components/PageHeader";

export default function NewAccountPage() {
  return (
    <>
      <PageHeader title="Nouveau compte" />
      <AccountForm />
    </>
  );
}
