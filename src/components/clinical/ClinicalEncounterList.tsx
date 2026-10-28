"use client";
import EncounterCollection from "@/components/workspace/EncounterCollection";

import { useEffect, useState } from "react";

import { listEncounters } from "@/lib/clinical-api";

import type { ClinicalEncounter } from "@/lib/clinical-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",

    timeStyle: "short",
  }).format(new Date(value));
}

export default function ClinicalEncounterList() {
  const [items, setItems] = useState<ClinicalEncounter[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listEncounters()
      .then((result) => {
        if (!active) {
          return;
        }

        setItems(result.items);

        setError(null);
      })
      .catch((cause) => {
        if (!active) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar atendimentos.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando atendimentos...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return <EncounterCollection items={items.map(e=>({id:e.id,title:e.chiefComplaint||"Atendimento clínico",time:formatDate(e.occurredAt),patient:e.patientId,status:e.status}))}/>;
}
