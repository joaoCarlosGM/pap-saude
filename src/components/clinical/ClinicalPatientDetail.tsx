"use client";

import PatientRecordView from "@/components/workspace/PatientRecordView";

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

  return <PatientRecordView data={{patient,pregnancies,encounters,allergies,flags,revisions}}/>;
}
