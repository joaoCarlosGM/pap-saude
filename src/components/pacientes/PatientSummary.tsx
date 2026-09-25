import AnimatedLineChart from "./AnimatedLineChart"

import type {
  Patient,
  PatientRisk,
} from "@/types/paciente"

type Props = {
  patient: Patient
}

function scoreText(risk: PatientRisk) {
  if (risk === "URGENCIA") {
    return {
      title: "URGÊNCIA",
      text: "Avaliação clínica prioritária.",
      classes:
        "border-red-100 bg-red-50 text-red-600",
    }
  }

  if (risk === "ATENCAO") {
    return {
      title: "ATENÇÃO",
      text: "Reavaliar parâmetros clínicos.",
      classes:
        "border-amber-100 bg-amber-50 text-amber-600",
    }
  }

  return {
    title: "BAIXO RISCO",
    text: "Manter acompanhamento de rotina.",
    classes:
      "border-emerald-100 bg-emerald-50 text-emerald-600",
  }
}

export default function PatientSummary({
  patient,
}: Props) {
  const score = scoreText(
    patient.latestScore.classification,
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Score atual
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Última avaliação registrada
          </p>

          <div
            className={[
              "mt-5 rounded-xl border p-5",
              score.classes,
            ].join(" ")}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-4xl font-semibold shadow-sm">
                {
                  patient.latestScore
                    .value
                }
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {score.title}
                </p>

                <p className="mt-1 text-xs opacity-75">
                  {score.text}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Tendência
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Evolução nas últimas consultas
          </p>

          <div className="mt-3 overflow-x-auto">
            <AnimatedLineChart
              data={patient.meowsTrend}
              min={0}
              max={7}
              height={210}
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Histórico Obstétrico
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [
                "Gestações",
                patient.obstetricHistory
                  .pregnancies,
              ],
              [
                "Partos",
                patient.obstetricHistory
                  .deliveries,
              ],
              [
                "Abortos",
                patient.obstetricHistory
                  .abortions,
              ],
              [
                "Cesáreas",
                patient.obstetricHistory
                  .cesareans,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg bg-slate-50 p-4 text-center"
              >
                <p className="text-xl font-semibold text-slate-900">
                  {value}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Comorbidades e Alergias
          </h2>

          <div className="mt-5">
            <p className="text-xs font-medium text-slate-400">
              COMORBIDADES
            </p>

            <div className="mt-2 space-y-2">
              {patient.comorbidities.length ? (
                patient.comorbidities.map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    >
                      • {item}
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm text-slate-500">
                  Sem comorbidades registradas.
                </p>
              )}
            </div>

            <p className="mt-5 text-xs font-medium text-slate-400">
              ALERGIAS
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {patient.allergies.map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Dados Pessoais e Contatos
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info
            label="CPF"
            value={patient.cpf}
          />

          <Info
            label="Cartão SUS"
            value={patient.sus}
          />

          <Info
            label="Data de nascimento"
            value={new Intl.DateTimeFormat(
              "pt-BR",
            ).format(
              new Date(
                patient.dataNascimento,
              ),
            )}
          />

          <Info
            label="Telefone"
            value={patient.telefone}
          />

          <Info
            label="Endereço"
            value={patient.endereco}
          />

          <Info
            label="DPP"
            value={new Intl.DateTimeFormat(
              "pt-BR",
            ).format(
              new Date(
                patient.pregnancy.dpp,
              ),
            )}
          />
        </div>
      </section>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-700">
        {value}
      </p>
    </div>
  )
}