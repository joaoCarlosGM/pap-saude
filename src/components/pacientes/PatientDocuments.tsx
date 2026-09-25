import {
  FileText,
  Eye,
} from "lucide-react"

import type { Patient } from "@/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientDocuments({
  patient,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {patient.documents.map(
        (document) => (
          <article
            key={document.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <FileText size={16} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {document.title}
                </p>

                <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                  {document.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-500 transition hover:bg-emerald-100"
            >
              <Eye size={12} />
              Visualizar
            </button>
          </article>
        ),
      )}
    </div>
  )
}