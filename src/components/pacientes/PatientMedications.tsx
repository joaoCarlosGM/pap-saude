import { Pill } from "lucide-react"

import type { Patient } from "@/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientMedications({
  patient,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Medicações em uso
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px]">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Medicação",
                "Dose",
                "Frequência",
                "Via",
              ].map((item) => (
                <th
                  key={item}
                  className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {item}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {patient.medications.map(
              (medication) => (
                <tr key={medication.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Pill
                        size={15}
                        className="text-pink-500"
                      />

                      <span className="text-sm font-medium text-slate-700">
                        {medication.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {medication.dose}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {medication.frequency}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {medication.route}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}