import {formatDemoDate} from '../../lib/demo/validation'
import type {Patient} from '../../types/paciente'

export default function PatientBackground({patient}: {patient: Patient}) {
  return (<div className="space-y-5">
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
                "Perdas gestacionais",
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
              {patient.historyStatus && <p className="text-xs text-slate-500">{patient.historyStatus}</p>}
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
              {patient.allergies.length===0 && <p className="text-sm text-slate-500">{patient.historyStatus || "Nenhum registro de alergia na fixture"}</p>}
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
            value={formatDemoDate(patient.dataNascimento.slice(0,10))}
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
            value={patient.pregnancy.dpp ? new Date(patient.pregnancy.dpp+"T12:00:00Z").toLocaleDateString("pt-BR",{timeZone:"UTC"}) : "DUM desconhecida"}
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