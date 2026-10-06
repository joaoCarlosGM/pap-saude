"use client";

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

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            Nenhum atendimento registrado nesta unidade.
          </div>
        ) : (
          items.map((encounter) => (
            <div
              key={encounter.id}
              className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {encounter.chiefComplaint || "Atendimento clínico"}
                </p>

                <p className="mt-1 text-xs tex-slate-500">
                  {formatDate(encounter.occurredAt)}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Paciente: {encounter.patientId}
                </p>
              </div>

              <span className="h-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {encounter.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
