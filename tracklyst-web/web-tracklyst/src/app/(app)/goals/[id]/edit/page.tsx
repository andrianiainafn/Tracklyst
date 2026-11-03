"use client";

import { use } from "react";
import { GoalForm } from "@/components/GoalForm";
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/stores/app";

export default function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { goals, loaded } = useApp();
  const goal = goals.find((g) => g.id === id);

  return (
    <>
      <PageHeader title="Modifier l'objectif" />
      {goal ? (
        <GoalForm key={goal.id} existing={goal} />
      ) : (
        <p className="px-4 py-12 text-center text-sm text-muted">{loaded ? "Objectif introuvable." : "Chargement…"}</p>
      )}
    </>
  );
}
