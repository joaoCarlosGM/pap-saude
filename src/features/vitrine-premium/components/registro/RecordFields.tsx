import {useId} from 'react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import type {RegistrationData} from '../../types/registration'
import {
  edemaLocations, edemaOptions, hasGradedEdema, emptyLab, outcomeOptions, proteinuriaMethods, proteinuriaOptions, referralOptions, labelFor,
} from '../../lib/registration-record'

type Props = {data: RegistrationData; onChange: (patch: Partial<RegistrationData>) => void}

export const textAreaClass = 'block min-h-20 w-full rounded-lg border border-slate-300 bg-white p-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-pink-600'

function options(entries: Record<string, string>, current?: string) {
  return <>
    <option value="">Selecione</option>
    {current && !Object.hasOwn(entries, current) && <option value={current}>{current} (registro anterior)</option>}
    {Object.entries(entries).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </>
}

export function ProteinuriaFields({data, onChange}: Props) {
  const methodId = useId()
  const lab = data.proteinuriaLab
  return <fieldset className="grid min-w-0 gap-3 md:col-span-2">
    <legend className="mb-3 font-semibold">Proteinúria</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <Select id="proteinuria" label="Resultado qualitativo" className="min-h-11 text-base" value={data.proteinuria} onChange={event => {
        const value = event.target.value
        onChange({proteinuria: value, proteinuriaMethod: value && value !== 'nao_realizado' ? data.proteinuriaMethod : undefined})
      }}>{options(proteinuriaOptions, data.proteinuria)}</Select>
      {data.proteinuria && data.proteinuria !== 'nao_realizado' && <Select id={methodId} label="Modalidade do teste qualitativo" className="min-h-11 text-base"
        value={data.proteinuriaMethod ?? ''} onChange={event => onChange({proteinuriaMethod: event.target.value})}>
        {options(proteinuriaMethods, data.proteinuriaMethod)}
      </Select>}
    </div>
    <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={!!lab} onChange={event => onChange({proteinuriaLab: event.target.checked ? {...emptyLab} : undefined})}/>
      Registrar resultado laboratorial quantitativo
    </label>
    {lab && <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Valor laboratorial" inputMode="decimal" className="min-h-11 text-base" maxLength={24} value={lab.value} onChange={event => onChange({proteinuriaLab: {...lab, value: event.target.value}})}/>
      <Input label="Unidade laboratorial" placeholder="Ex.: mg/24 h" className="min-h-11 text-base" maxLength={40} value={lab.unit} onChange={event => onChange({proteinuriaLab: {...lab, unit: event.target.value}})}/>
      <Input label="Data do exame" type="date" className="min-h-11 text-base" value={lab.date} onChange={event => onChange({proteinuriaLab: {...lab, date: event.target.value}})}/>
      <Input label="Método laboratorial" className="min-h-11 text-base" maxLength={100} value={lab.method} onChange={event => onChange({proteinuriaLab: {...lab, method: event.target.value}})}/>
    </div>}
  </fieldset>
}

export function EdemaFields({data, onChange}: Props) {
  const locations = data.edemaLocations ?? []
  return <fieldset className="grid min-w-0 gap-2 md:col-span-2">
    <legend className="mb-3 font-semibold">Edema</legend>
    <div className="max-w-md">
      <Select id="edema" label="Gradação do edema" className="min-h-11 text-base" value={data.edema}
        onChange={event => {
          const edema = event.target.value
          onChange(hasGradedEdema(edema) ? {edema} : {edema, edemaLocations:undefined, edemaOtherLocation:undefined})
        }}>{options(edemaOptions, data.edema)}</Select>
    </div>
    {hasGradedEdema(data.edema) && <><fieldset className="grid gap-x-4 sm:grid-cols-2">
      <legend className="mt-2 text-sm font-medium">Localização do edema</legend>
      {Object.entries(edemaLocations).map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={locations.includes(value)} onChange={event => onChange({
          edemaLocations: event.target.checked ? [...locations, value] : locations.filter(location => location !== value),
          ...(value === 'outro' && !event.target.checked ? {edemaOtherLocation: undefined} : {}),
        })}/>{label}
      </label>)}
    </fieldset>
    {locations.includes('outro') && <Input label="Outra localização do edema" className="min-h-11 text-base" maxLength={150}
      value={data.edemaOtherLocation ?? ''} onChange={event => onChange({edemaOtherLocation: event.target.value})}/>}</>}
  </fieldset>
}

export function ClosureFields({data, onChange, saved}: Props & {saved: boolean}) {
  const id = useId()
  return <div className="mt-5 grid gap-4 sm:grid-cols-2">
    {([
      {key: 'referral', title: 'Conduta e encaminhamento', details: 'Observação da conduta', choices: referralOptions},
      {key: 'outcome', title: 'Desfecho da consulta', details: 'Observação do desfecho', choices: outcomeOptions},
    ] as const).map(({key, title, details, choices}) => {
      const choice = `${key}Choice` as const
      const detail = `${key}Details` as const
      return <fieldset key={key} className="grid content-start gap-3" disabled={saved}>
        <Select id={id+choice} label={title} className="min-h-11 text-base" value={data[choice] ?? ''}
          onChange={event => onChange({[choice]: event.target.value})}>{options(choices, data[choice])}</Select>
        <label className="grid gap-1 text-sm font-medium">{details}
          <textarea className={textAreaClass} rows={2} maxLength={1000} value={data[detail] ?? ''}
            onChange={event => onChange({[detail]: event.target.value})}/>
        </label>
        {data[key] && <p className="text-sm text-slate-600">Registro anterior: {labelFor(choices, data[key])}</p>}
      </fieldset>
    })}
  </div>
}
