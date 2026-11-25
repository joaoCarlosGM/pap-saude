import {assessmentPresentation} from "@/features/vitrine-premium/lib/demo/assessment-presentation"
import {assessmentFlags} from '../../lib/chart-assessment'
import {formatRecordTime} from '../../lib/registration-record'
import {formatDemoDate} from "@/features/vitrine-premium/lib/demo/validation"
import {
  AlertTriangle,
  Bell,
} from "lucide-react"

import type {
  Patient,
} from "@/features/vitrine-premium/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientHeader({
  patient,
}: Props) {
  const {flags,visit} = assessmentFlags(patient.encounters)
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-500 text-sm font-semibold text-white sm:h-14 sm:w-14">
            {patient.initials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
                {patient.nome}
              </h1>

              <span className="text-xs text-slate-400">
                {assessmentPresentation(patient.latestScore.classification).label}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{patient.idade} anos</span>
              <span>•</span>
              <span>
                IG:{" "}
                {patient.pregnancy.gestationalAge}
              </span>
              <span>•</span>
              <span>
                DPP:{" "}
                {formatDemoDate(patient.pregnancy.dpp)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-medium text-pink-600">
                {patient.pregnancy.trimester}
              </span>

              {patient.allergies.map(
                (allergy) => (
                  <span
                    key={allergy}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-500"
                  >
                    <AlertTriangle size={11} />
                    Alergia: {allergy}
                  </span>
                ),
              )}

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                CPF {patient.cpf}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="min-w-24 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <p className="text-xl font-semibold text-slate-900">
              {patient.consultations}
            </p>

            <p className="text-[11px] text-slate-400">
              consultas
            </p>
          </div>

          <div className="min-w-24 rounded-lg border border-pink-100 bg-pink-50 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Bell
                size={13}
                className="text-pink-500"
              />

              <p className="text-xl font-semibold text-pink-600">
                {visit?.assessment?.status === 'CALCULADO' ? flags.length : '—'}
              </p>
            </div>

            <p className="text-[11px] text-pink-400">
              alertas MEOWS
            </p>
            {!!flags.length && <details className="relative mt-1 text-xs">
              <summary className="min-h-8 cursor-pointer content-center text-pink-700">Ver alertas</summary>
              <div className="z-20 min-w-40 rounded-lg border border-slate-200 bg-white p-3 text-left sm:absolute sm:right-0 sm:shadow-md">
                <p className="font-medium">Avaliação demonstrativa</p>
                <p className="my-1 text-slate-600">{formatRecordTime(visit!.dataHora)}</p>
                <ul className="space-y-1">{flags.map(flag => <li key={flag.key}>{flag.parameter} · {flag.value}</li>)}</ul>
              </div>
            </details>}
          </div>
        </div>
      </div>
    </section>
  )
}