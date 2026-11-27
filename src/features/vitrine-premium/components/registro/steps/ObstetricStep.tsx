"use client"

import {useState} from "react"
import {Baby,CalendarDays,Clock,Droplet,Stethoscope} from "lucide-react"
import {RegistrationCardHeading,RegistrationFooter,RegistrationHeading,registrationCard} from "../RegistrationLayout"
import Input from "../../ui/Input"
import {EdemaFields} from "../RecordFields"
import {SoapEditor, SoapHistory} from "../SoapNotes"
import ClinicalHistory from "../ClinicalHistory"
import {datingLabels,resolveDating,unitCivilDay} from "../../../lib/gestational-dating"
import {formatDemoDate} from "../../../lib/demo/validation"
import type { RegistrationData } from "@/features/vitrine-premium/types/registration"

type ObstetricStepProps = {
  data: RegistrationData
  onChange: (data: Partial<RegistrationData>) => void
  onNext: () => void
  onBack: () => void
}

export default function ObstetricStep({
  data,
  onChange,
  onNext,
  onBack,
}: ObstetricStepProps) {
  const dating=resolveDating(data,unitCivilDay())
  const [pendingNote, setPendingNote] = useState(false)
  const [noteError, setNoteError] = useState(false)

  function navigate(action: () => void) {
    if (pendingNote) {
      setNoteError(true)
      return
    }
    action()
  }
  return (
    <div>
      <RegistrationHeading icon={Baby} title="Dados Obstétricos e Clínicos">Registre as informações obstétricas e clínicas do atendimento.</RegistrationHeading>
      <div className="space-y-4">
        <section className={`${registrationCard} grid items-center gap-3 min-[1100px]:grid-cols-[29fr_37fr_34fr]`} aria-label="Datação gestacional">
          <RegistrationCardHeading icon={CalendarDays} title="Datação gestacional">Datação informada na etapa Gestação.</RegistrationCardHeading>
          <dl className="grid gap-1 text-sm min-[1100px]:border-l min-[1100px]:border-slate-200 min-[1100px]:pl-4">
            <dt className="font-medium">Origem da datação</dt>
            <dd className="text-slate-600">{dating ? datingLabels[dating.source] : 'Ainda não informada'}</dd>
            {dating?.source==='dum' && <><dt className="mt-2 font-medium">Data da Última Menstruação (DUM)</dt><dd className="text-slate-600">{formatDemoDate(data.dum)}</dd></>}
            {data.dating?.source==='ultrasound' && dating && <><dt className="mt-2 font-medium">Data do exame</dt><dd className="text-slate-600">{formatDemoDate(data.dating.date)}</dd></>}

          </dl>
          <dl className="grid grid-cols-2 gap-2 rounded-xl bg-pink-50 p-3 text-sm">
            <div><dt className="flex items-center gap-1 font-medium"><Clock size={16} aria-hidden className="text-[#C41469]"/>IG atual</dt><dd className="mt-1 font-semibold">{dating ? `${dating.weeks}s ${dating.days}d` : '—'}</dd></div>
            <div className="border-l border-pink-200 pl-2"><dt className="flex items-center gap-1 font-medium"><CalendarDays size={16} aria-hidden className="text-[#C41469]"/>DPP</dt><dd className="mt-1 font-semibold">{dating ? formatDemoDate(dating.dueDate) : '—'}</dd></div>
          </dl>
        </section>
        <div className="grid items-start gap-4 lg:grid-cols-[55fr_45fr]">
          <section className={registrationCard}>
            <RegistrationCardHeading icon={Baby} title="Avaliação obstétrica">Principais achados do exame obstétrico.</RegistrationCardHeading>
            <div className="grid gap-4 sm:grid-cols-2">
          {/* Altura uterina */}
          <div>
            <label
              htmlFor="altura-uterina"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Altura Uterina
            </label>

            <div className="relative">
              <input
                id="altura-uterina"
                type="number"
                step="0.1"
                value={data.alturaUterina}
                onChange={(event) =>
                  onChange({
                    alturaUterina: event.target.value,
                  })
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                cm
              </span>
            </div>
          </div>

          {/* BCF */}
          <div>
            <label
              htmlFor="bcf"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              BCF
            </label>

            <div className="relative">
              <input
                id="bcf"
                type="number"
                value={data.bcf}
                onChange={(event) =>
                  onChange({
                    bcf: event.target.value,
                  })
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                bpm
              </span>
            </div>
          </div>

          {/* Movimentação fetal */}
          <div>
            <label
              htmlFor="movimentacao-fetal"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Movimentação Fetal
            </label>

            <select
              id="movimentacao-fetal"
              value={data.movimentacaoFetal}
              onChange={(event) =>
                onChange({
                  movimentacaoFetal: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="presente">Presente</option>
              <option value="reduzida">Reduzida</option>
              <option value="ausente">Ausente</option>
            </select>
          </div>

          {/* Sangramento vaginal */}
          <div>
            <label
              htmlFor="sangramento-vaginal"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Sangramento Vaginal
            </label>

            <select
              id="sangramento-vaginal"
              value={data.sangramentoVaginal}
              onChange={(event) =>
                onChange({
                  sangramentoVaginal: event.target.value,
                })
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            >
              <option value="">Selecione</option>
              <option value="ausente">Ausente</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </select>
          </div>

          {/* Peso atual */}
          <div>
            <label
              htmlFor="peso-atual"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Peso Atual
            </label>

            <div className="relative">
              <input
                id="peso-atual"
                type="number"
                step="0.1"
                value={data.pesoAtual}
                onChange={(event) =>
                  onChange({
                    pesoAtual: event.target.value,
                  })
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                kg
              </span>
            </div>
          </div>
            </div>
          </section>
          <section className={registrationCard}>
            <RegistrationCardHeading icon={Droplet} title="Edema">Avalie a presença e a graduação do edema.</RegistrationCardHeading>
            <EdemaFields data={data} onChange={onChange} compact/>
          </section>
        </div>
        <section className={`${registrationCard} grid gap-3`}>
          <RegistrationCardHeading icon={Stethoscope} title="Registro clínico do atendimento">Registre a queixa e as anotações SOAP.</RegistrationCardHeading>
          <Input id="queixas-principais" label="Queixa principal" value={data.queixasPrincipais} maxLength={200}
            className="min-h-11 text-base" onChange={event => onChange({queixasPrincipais: event.target.value})}/>
          <SoapEditor onPendingChange={pending => {setPendingNote(pending); if (!pending) setNoteError(false)}}
            onAppend={note => onChange({soapNotes: [...(data.soapNotes ?? []), note]})}/>
          {noteError && <p role="alert" className="text-sm text-rose-700">Adicione a anotação ou limpe o texto antes de mudar de etapa.</p>}
          {(!!data.soapNotes?.length || data.observacoesProfissional) && <details><summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Anotações registradas</summary><SoapHistory notes={data.soapNotes} legacy={data.observacoesProfissional}/></details>}
        </section>
      </div>

      <ClinicalHistory data={data} onChange={onChange} />
      <RegistrationFooter onBack={() => navigate(onBack)} onNext={() => navigate(onNext)} next="Ver Resultado →"/>
    </div>
  )
}