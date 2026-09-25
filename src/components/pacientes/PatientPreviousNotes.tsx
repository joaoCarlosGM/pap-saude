import type { Patient } from "@/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientPreviousNotes({
  patient,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        Observações Anteriores
      </h2>

      <div className="mt-5 space-y-3">
        {patient.previousNotes.length ? (
          patient.previousNotes.map(
            (note) => (
              <article
                key={note.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-slate-600">
                    {note.professional}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {new Intl.DateTimeFormat(
                      "pt-BR",
                    ).format(
                      new Date(note.date),
                    )}
                  </p>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {note.text}
                </p>
              </article>
            ),
          )
        ) : (
          <p className="text-sm text-slate-400">
            Nenhuma observação registrada.
          </p>
        )}
      </div>
    </section>
  )
}