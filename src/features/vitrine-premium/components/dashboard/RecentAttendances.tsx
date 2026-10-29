"use client"
import {assessmentPresentation} from "@/features/vitrine-premium/lib/demo/assessment-presentation"

import {useState} from "react"
import {useDemo} from "@/features/vitrine-premium/components/demo/DemoProvider"
import AtendimentoDetailsModal from "@/features/vitrine-premium/components/atendimentos/AtendimentoDetailsModal"
import Link from "next/link"

import {
  ArrowRight,
} from "lucide-react"

import type {
  DashboardAttendance,
} from "@/features/vitrine-premium/types/dashboard"

type Props = {
  data: DashboardAttendance[]
}

function classificationStyle(
  classification:
    DashboardAttendance["classification"],
) {
 return assessmentPresentation(classification)
}

export default function RecentAttendances({
  data,
}: Props) {
  const {state}=useDemo()
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const selected=state.encounters.find(a=>a.id===selectedId)||null
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            Atendimentos recentes
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Últimos registros realizados
          </p>
        </div>

        <Link
          href="/vitrine/atendimentos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700"
        >
          Ver todos
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {data.map((attendance) => {
          const classification =
            classificationStyle(
              attendance.classification,
            )

          return (
            <div
              key={attendance.id}
              data-motion-item
              role="button" tabIndex={0} aria-label={`Ver atendimento de ${attendance.patient}`} data-recent-encounter={attendance.id}
              onClick={()=>setSelectedId(attendance.id)}
              onKeyDown={e=>{if(e.target===e.currentTarget&&['Enter',' '].includes(e.key)){e.preventDefault();setSelectedId(attendance.id)}}}
              className="cursor-pointer focus-visible:outline-2 focus-visible:outline-pink-500 hover:bg-slate-50 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-xs font-semibold text-pink-600">
                  {attendance.initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {attendance.patient}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {attendance.gestationalAge}
                    {" · "}
                    {attendance.professional}
                    {" · "}
                    {attendance.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    classification.className,
                  ].join(" ")}
                >
                  {attendance.score} ·{" "}
                  {classification.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <AtendimentoDetailsModal atendimento={selected} open={!!selected} onClose={()=>setSelectedId(null)}/>
    </section>
  )
}