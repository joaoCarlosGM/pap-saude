"use client"

import { useState } from "react"

import PatientDocuments from "./PatientDocuments"
import PatientEvolution from "./PatientEvolution"
import PatientExams from "./PatientExams"
import PatientMedications from "./PatientMedications"
import PatientPreviousNotes from "./PatientPreviousNotes"
import PatientSummary from "./PatientSummary"
import PatientTimeline from "./PatientTimeline"
import PatientVaccines from "./PatientVaccines"

import type { Patient } from "@/types/paciente"

type Props = {
  patient: Patient
}

const tabs = [
  {
    id: "resumo",
    label: "Resumo",
  },
  {
    id: "timeline",
    label: "Timeline",
  },
  {
    id: "observacoes",
    label: "Obs. Anteriores",
  },
  {
    id: "evolucao",
    label: "Evolução",
  },
  {
    id: "exames",
    label: "Exames",
  },
  {
    id: "vacinacao",
    label: "Vacinação",
  },
  {
    id: "medicacoes",
    label: "Medicações",
  },
  {
    id: "documentos",
    label: "Documentos",
  },
] as const

type TabId = (typeof tabs)[number]["id"]

export default function PatientTabs({
  patient,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<TabId>("resumo")

  return (
    <div>
      <div className="overflow-x-auto rounded-lg bg-slate-100 p-1">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id)
              }
              className={[
                "relative whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-all sm:px-4",
                activeTab === tab.id
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        key={activeTab}
        className="mt-4 animate-[patientTabIn_.28s_ease-out]"
      >
        {activeTab === "resumo" && (
          <PatientSummary
            patient={patient}
          />
        )}

        {activeTab === "timeline" && (
          <PatientTimeline
            patient={patient}
          />
        )}

        {activeTab ===
          "observacoes" && (
          <PatientPreviousNotes
            patient={patient}
          />
        )}

        {activeTab === "evolucao" && (
          <PatientEvolution
            patient={patient}
          />
        )}

        {activeTab === "exames" && (
          <PatientExams
            patient={patient}
          />
        )}

        {activeTab === "vacinacao" && (
          <PatientVaccines
            patient={patient}
          />
        )}

        {activeTab ===
          "medicacoes" && (
          <PatientMedications
            patient={patient}
          />
        )}

        {activeTab ===
          "documentos" && (
          <PatientDocuments
            patient={patient}
          />
        )}
      </div>
    </div>
  )
}