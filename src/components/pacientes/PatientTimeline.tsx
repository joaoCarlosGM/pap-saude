import {
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Syringe,
} from "lucide-react"

import type {
  Patient,
  TimelineEventType,
} from "@/types/paciente"

type Props = {
  patient: Patient
}

function EventIcon({
  type,
}: {
  type: TimelineEventType
}) {
  const classes =
    "h-8 w-8 rounded-full flex items-center justify-center"

  if (type === "vacina") {
    return (
      <div
        className={`${classes} bg-emerald-50 text-emerald-500`}
      >
        <Syringe size={15} />
      </div>
    )
  }

  if (type === "exame") {
    return (
      <div
        className={`${classes} bg-blue-50 text-blue-500`}
      >
        <FlaskConical size={15} />
      </div>
    )
  }

  if (type === "medicacao") {
    return (
      <div
        className={`${classes} bg-violet-50 text-violet-500`}
      >
        <Pill size={15} />
      </div>
    )
  }

  if (type === "documento") {
    return (
      <div
        className={`${classes} bg-slate-100 text-slate-500`}
      >
        <FileText size={15} />
      </div>
    )
  }

  return (
    <div
      className={`${classes} bg-pink-50 text-pink-500`}
    >
      <HeartPulse size={15} />
    </div>
  )
}

export default function PatientTimeline({
  patient,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        Linha do Tempo
      </h2>

      <p className="mt-1 text-xs text-slate-400">
        Eventos registrados no acompanhamento
      </p>

      <div className="mt-5">
        {patient.timeline.map(
          (event, index) => (
            <div
              key={event.id}
              className="relative flex gap-4 pb-5"
            >
              {index <
                patient.timeline.length -
                  1 && (
                <div className="absolute left-4 top-8 h-full w-px bg-slate-100" />
              )}

              <div className="relative z-10 shrink-0 bg-white">
                <EventIcon
                  type={event.type}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">
                    {event.title}
                  </p>

                  {event.subtitle && (
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {event.subtitle}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-[11px] text-slate-400">
                  {new Intl.DateTimeFormat(
                    "pt-BR",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    },
                  ).format(
                    new Date(event.date),
                  )}
                </span>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  )
}