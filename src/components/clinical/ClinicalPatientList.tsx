"use client";

import {patientAge} from "@/lib/patient-age";
import PatientCollection from "@/components/workspace/PatientCollection";

import { useEffect, useState } from "react";

import { listPatients } from "@/lib/clinical-api";

import type { ClinicalPatient } from "@/lib/clinical-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC"}).format(new Date(value));
}

export default function ClinicalPatientList() {
  const [patients, setPatients] = useState<ClinicalPatient[]>([]);

  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);

        const result = await listPatients(query);

        if (active) {
          setPatients(result.items);

          setError(null);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Falha ao carregar pacientes.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;

      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <input
        aria-label="Buscar pacientes"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome, CPF ou CNS"
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none focus:border-pink-500"
      />

      {loading && (
        <p className="text-sm text-slate-500">Carregando pacientes...</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && patients.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Nenhuma paciente encontrada nesta unidade.
        </div>
      )}

      <PatientCollection items={patients.map(p=>({id:p.id,name:p.fullName,description:`${patientAge(p.birthDate)!==null?`${patientAge(p.birthDate)} anos · `:""}Nascimento: ${formatDate(p.birthDate)}`,detail:p.cpf?`CPF: ${p.cpf}`:undefined,active:p.isActive,href:`/pacientes/${p.id}`}))}/>

    </div>
  );
}
