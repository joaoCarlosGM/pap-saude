import AnimatedLineChart from "./AnimatedLineChart"

import type { Patient } from "@/types/paciente"

type Props = {
  patient: Patient
}

export default function PatientEvolution({
  patient,
}: Props) {
  return (
    <div className="space-y-5">
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Evolução do Score
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Histórico das avaliações
            </p>
          </div>

          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-medium text-pink-600">
            Atual:{" "}
            {patient.latestScore.value}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <AnimatedLineChart
            data={patient.meowsTrend}
            min={0}
            max={7}
            height={280}
          />
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Evolução da PA Sistólica
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Pressão arterial sistólica ao longo das consultas
        </p>

        <div className="mt-4 overflow-x-auto">
          <AnimatedLineChart
            data={patient.systolicTrend}
            min={90}
            max={170}
            height={280}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Histórico de Avaliações
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Nº",
                  "Data",
                  "Score",
                  "Classificação",
                  "Profissional",
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
              {patient.meowsTrend
                .slice()
                .reverse()
                .map((item, index) => (
                  <tr key={item.label}>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {patient.consultations -
                        index}
                    </td>

                    <td className="px-5 py-3 text-sm text-slate-500">
                      Consulta{" "}
                      {patient.consultations -
                        index}
                    </td>

                    <td className="px-5 py-3 text-sm font-semibold text-slate-700">
                      {item.value}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          item.value >= 5
                            ? "bg-red-50 text-red-600"
                            : item.value >= 3
                              ? "bg-amber-50 text-amber-600"
                              : "bg-emerald-50 text-emerald-600",
                        ].join(" ")}
                      >
                        {item.value >= 5
                          ? "URGÊNCIA"
                          : item.value >= 3
                            ? "ATENÇÃO"
                            : "BAIXO RISCO"}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-sm text-slate-500">
                      Enf. Ana Paula
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}