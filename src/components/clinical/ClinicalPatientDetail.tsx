"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import {
  getPatient,
  listAllergies,
  listEncounters,
  listFlags,
  listPregnancies,
  listRevisions,
} from "@/lib/clinical-api";

import type {
  ClinicalAllergy,
  ClinicalEncounter,
  ClinicalFlag,
  ClinicalPatient,
  ClinicalPregnancy,
  ClinicalRevision,
} from "@/lib/clinical-api";

type Props = {
  patientId: string;
};

function date(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export default function ClinicalPatientDetail({ patientId }: Props) {
  const [patient, setPatient] = useState<ClinicalPatient | null>(null);

  const [pregnancies, setPregnancies] = useState<ClinicalPregnancy[]>([]);

  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);

  const [allergies, setAllergies] = useState<ClinicalAllergy[]>([]);

  const [flags, setFlags] = useState<ClinicalFlag[]>([]);

  const [revisions, setRevisions] = useState<ClinicalRevision[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getPatient(patientId),

      listPregnancies(patientId),

      listEncounters(patientId),

      listAllergies(patientId),

      listFlags(patientId),

      listRevisions(patientId),
    ])
      .then(
        ([
          patientResult,
          pregnancyResult,
          encounterResult,
          allergyResult,
          flagResult,
          revisionResult,
        ]) => {
          if (!active) {
            return;
          }

          setPatient(patientResult.patient);

          setPregnancies(pregnancyResult.items);

          setEncounters(encounterResult.items);

          setAllergies(allergyResult.items);

          setFlags(flagResult.items);

          setRevisions(revisionResult.items);
        },
      )
      .catch((cause) => {
        if (!active) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar prontuário.",
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
  }, [patientId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando prontuário...</p>;
  }

  if (error || !patient) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error ?? "Paciente não encontrada."}
      </div>
    );
  }

  const activePregnancy = pregnancies.find((item) => item.status === "ACTIVE");

  return (
    <div className="space-y-5">
      <Link
        href="/pacientes"
        className="text-sm font-medium text-slate-500 hover:text-pink-600"
      >
        ← Voltar para pacientes
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          {patient.fullName}
        </h1>

        {patient.socialName && (
          <p className="mt-1 text-sm text-slate-500">
            Nome social: {patient.socialName}{" "}
          </p>
        )}

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-slate-400">Nascimento</span>

            <p className="font-medium text-slate-700">
              {date(patient.birthDate)}
            </p>
          </div>

          <div>
            <span className="text-slate-400">CPF</span>

            <p className="font-medium text-slate-700">{patient.cpf ?? "—"}</p>
          </div>

          <div>
            <span className="text-slate-400">CNS</span>

            <p className="font-medium text-slate-700">{patient.cns ?? "—"}</p>
          </div>

          <div>
            <span className="text-slate-400">Telefone</span>

            <p className="font-medium text-slate-700">{patient.phone ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Gestação</h2>

          {activePregnancy ? (
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>
                Status: <strong>{activePregnancy.status}</strong>
              </p>

              <p>DUM: {date(activePregnancy.lastMenstrualDate)}</p>

              <p>DPP: {date(activePregnancy.estimatedDueDate)}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Sem gestação ativa registrada.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">
            Alertas clínicos explícitos
          </h2>

          <div className="mt-3 space-y-2">
            {flags.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum flag clínico registrado.
              </p>
            ) : (
              flags.map((flag) => (
                <div
                  key={flag.id}
                  className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
                >
                  <strong>{flag.label}</strong>

                  {flag.details && <p className="mt-1">{flag.details}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Alergias</h2>

        <div className="mt-3 space-y-2">
          {allergies.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma alergia registrada.
            </p>
          ) : (
            allergies.map((allergy) => (
              <div
                key={allergy.id}
                className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm"
              >
                <strong className="text-red-900">{allergy.substance}</strong>

                <p className="text-red-700">
                  {allergy.reaction ?? "Reação não informada"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Atendimentos</h2>

        <div className="mt-3 space-y-2">
          {encounters.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum atendimento registrado.
            </p>
          ) : (
            encounters.map((encounter) => (
              <div
                key={encounter.id}
                className="rounded-lg bg-slate-50 p-3 text-sm"
              >
                <div className="flex justify-between gap-3">
                  <span>
                    {encounter.chiefComplaint || "Atendimento clínico"}
                  </span>

                  <strong>{encounter.status}</strong>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  {date(encounter.occurredAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Histórico de revisões</h2>

        <div className="mt-3 space-y-2">
          {revisions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma revisão clínica registrada.
            </p>
          ) : (
            revisions.map((revision) => (
              <div
                key={revision.id}
                className="rounded-lg bg-slate-50 p-3 text-sm"
              >
                <strong>{revision.resourceType}</strong>

                <p className="mt-1 text-slate-600">
                  {revision.reason ?? "Sem motivo informado"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {date(revision.occurredAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
