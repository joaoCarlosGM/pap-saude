"use client"

import {useEffect, useState} from "react"
import { useSearchParams } from "next/navigation"

import AgendaPanel, {UpcomingAppointments,type AgendaDraft} from "../agenda/AgendaPanel"
import PatientDocuments from "./PatientDocuments"
import PatientEvolution from "./PatientEvolution"
import PatientExams from "./PatientExams"
import PatientMedications from "./PatientMedications"
import PatientPreviousNotes from "./PatientPreviousNotes"
import PatientSummary from "./PatientSummary"
import PatientTimeline from "./PatientTimeline"
import LongitudinalPanel from './LongitudinalPanel'
import IntegratedTimeline, {type TimelineTab} from './IntegratedTimeline'
import {useLongitudinal} from './LongitudinalContext'
import PatientVaccines from "./PatientVaccines"

import type { Patient } from "@/features/vitrine-premium/types/paciente"

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
    id: "agenda",
    label: "Agenda",
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
  const requested = useSearchParams().get("aba")
  const [activeTab, setActiveTab] =
    useState<TabId>(requested === "documentos" ? "documentos" : "resumo")

  const chart = useLongitudinal()
  const [draft,setDraft] = useState<AgendaDraft>()
  const [anchor,setAnchor] = useState('')
  useEffect(() => {
    if (!anchor) return
    function focusRecord() {
      const target = document.getElementById('registro-'+anchor)
      if (!target) return false
      if (target instanceof HTMLDetailsElement) target.open = true
      target.focus()
      target.scrollIntoView({block:'nearest'})
      return true
    }
    if (focusRecord()) return
    const observer = new MutationObserver(() => {if (focusRecord()) observer.disconnect()})
    observer.observe(document.querySelector('main') ?? document.body,{childList:true,subtree:true})
    return () => observer.disconnect()
  }, [activeTab,anchor])

  function open(tab: TabId, target = '') {
    if (activeTab === 'documentos' || tab === 'timeline') chart?.reload()
    setAnchor(target)
    setDraft(undefined)
    setActiveTab(tab)
  }

  function openEvent(tab:TimelineTab, target:string) {
    open(tab === 'consulta' ? 'evolucao' : tab,target)
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg bg-slate-100 p-1">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                open(tab.id)
              }
              className={[
                "relative min-h-11 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-all sm:px-4",
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
          <>
            <UpcomingAppointments patient={patient} onOpen={() => open('agenda')}/>
            <LongitudinalPanel kinds={['contato','identidade','alergia','comorbidade','historico']}/>
            <PatientSummary patient={patient}/>
          </>
        )}

        {activeTab === "timeline" && (
          <>
            <IntegratedTimeline patient={patient} onOpen={openEvent}/>
            <PatientTimeline patient={patient}/>
          </>
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
          <>
            <LongitudinalPanel kinds={['pedido','resultado']}/>
            {!!patient.exams.length && <h3 className="mb-2 text-sm font-medium">Exames ilustrativos da fixture</h3>}
            <PatientExams patient={patient}/>
          </>
        )}

        {activeTab === "vacinacao" && (
          <>
            <LongitudinalPanel kinds={['vacina']} onSchedule={value => {open('agenda');setDraft(value)}}/>
            {!!patient.vaccines.length && <h3 className="mb-2 text-sm font-medium">Doses ilustrativas da fixture</h3>}
            <PatientVaccines patient={patient}/>
          </>
        )}

        {activeTab ===
          "medicacoes" && (
          <>
            <LongitudinalPanel kinds={['medicacao']}/>
            <PatientMedications patient={patient}/>
          </>
        )}

        {activeTab === "agenda" && <AgendaPanel patient={patient} draft={draft}/>}

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