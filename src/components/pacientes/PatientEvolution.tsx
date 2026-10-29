import {assessmentPresentation} from "@/lib/demo/assessment-presentation"
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
              Somente cálculos demonstrativos; fixtures ilustrativas excluídas do gráfico
            </p>
          </div>

          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-medium text-pink-600">
            Atual:{" "}
            {patient.latestScore.value ?? "Não avaliado"}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <AnimatedLineChart
            data={patient.meowsTrend}
            min={0}
            max={21}
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
            min={Math.min(90,...patient.systolicTrend.map(p=>p.value))}
            max={Math.max(170,...patient.systolicTrend.map(p=>p.value))}
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
              {(patient.encounters || [])
                .slice()
                .reverse()
                .map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {patient.consultations -
                        index}
                    </td>

                    <td className="px-5 py-3 text-sm text-slate-500">
                      {new Date(item.dataHora).toLocaleDateString("pt-BR",{timeZone:"UTC"})}
                    </td>

                    <td className="px-5 py-3 text-sm font-semibold text-slate-700">
                      {item.score ?? "Não avaliado"}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          assessmentPresentation(item.classificacao).className,
                        ].join(" ")}
                      >
                        {assessmentPresentation(item.classificacao).label}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-sm text-slate-500">
                      {item.profissional.nome}
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