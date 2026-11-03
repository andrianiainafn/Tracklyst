"use client";

import { GoalForm } from "@/components/GoalForm";
import { PageHeader } from "@/components/PageHeader";

export default function NewGoalPage() {
  return (
    <>
      <PageHeader title="Nouvel objectif" />
      <GoalForm />
    </>
  );
}
