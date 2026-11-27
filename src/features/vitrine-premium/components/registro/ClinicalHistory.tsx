'use client'

import {Pill,Plus} from 'lucide-react'
import type {ReactNode} from 'react'
import Input from '../ui/Input'
import {RegistrationCardHeading,registrationCard,registrationField} from './RegistrationLayout'
import type {RegistrationData} from '../../types/registration'

const action='inline-flex min-h-11 items-center justify-center gap-1 rounded-[10px] border border-pink-300 px-3 text-sm font-medium text-pink-800 hover:bg-pink-50'
const remove='min-h-11 justify-self-start text-sm font-medium text-slate-700 underline'
const unknown='Não investigado'

function ClinicalGroup({id,title,state,verified,children}: {id:string;title:string;state:string;verified:boolean;children:ReactNode}) {
  return <details name="registration-clinical-history" data-clinical-section={id} className="group min-w-0 border-slate-200 pt-3 first:pt-0 max-[1099px]:border-t max-[1099px]:first:border-t-0 min-[1100px]:border-l min-[1100px]:pl-4 min-[1100px]:pt-0 min-[1100px]:first:border-l-0 min-[1100px]:first:pl-0">
    <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0"><span className="block text-sm font-semibold">{title}</span>
        <span className={`mt-1 inline-block text-xs text-slate-600 ${verified?'rounded-full bg-slate-100 px-2 py-1':''}`}>{state}</span>
      </span>
      <span className={action}><Plus size={14} aria-hidden/><span className="group-open:hidden">{verified?'Gerenciar':'Adicionar'}</span><span className="hidden group-open:inline">Fechar</span></span>
    </summary>
    <div className="mt-3 grid min-w-0 gap-3">{children}</div>
  </details>
}

export default function ClinicalHistory({data,onChange}: {data:RegistrationData;onChange:(patch:Partial<RegistrationData>)=>void}) {
  const allergies=data.allergies??[], medications=data.medications??[], conditions=data.conditions??[]
  const allergyStatus=data.allergyStatus??'desconhecido', conditionStatus=data.comorbidityStatus??'desconhecido'
  return <section className={`${registrationCard} mt-4`}>
    <RegistrationCardHeading icon={Pill} title="Alergias, medicações e comorbidades">Registre os antecedentes clínicos informados.</RegistrationCardHeading>
    <div className="grid items-start gap-3 min-[1100px]:grid-cols-3">
      <ClinicalGroup id="allergies" title="Alergias" verified={allergyStatus!=='desconhecido'}
        state={allergyStatus==='nao'?'Investigado sem relato':allergyStatus==='sim'?'Com relato':unknown}>
        <div className="grid gap-2 text-sm"><label htmlFor="registration-allergy-status">Investigação de alergias</label>
          <select id="registration-allergy-status" aria-label="Investigação de alergias" className={registrationField} value={allergyStatus}
            onChange={event=>onChange({allergyStatus:event.target.value as RegistrationData['allergyStatus']})}>
            <option value="desconhecido">Desconhecido</option><option value="sim">Sim, com relato</option><option value="nao">Sim, sem relato de alergias</option>
          </select>
        </div>
        {allergyStatus==='sim'&&<>
          <button type="button" className={`${action} justify-self-start`} onClick={()=>onChange({allergies:[...allergies,{agent:'',reaction:'',notes:''}]})}>Adicionar alergia</button>
          {allergies.map((allergy,index)=><div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3">
            {(['agent','reaction','notes'] as const).map((key,i)=><Input key={key} id={`allergy-${index}-${key}`} label={`${['Substância ou agente','Reação relatada','Observações'][i]} ${index+1}`} className={registrationField} value={allergy[key]}
              onChange={event=>onChange({allergies:allergies.map((row,n)=>n===index?{...row,[key]:event.target.value}:row)})}/>)}
            <button type="button" className={remove} onClick={()=>onChange({allergies:allergies.filter((_,n)=>n!==index)})}>Remover alergia {index+1}</button>
          </div>)}
        </>}
      </ClinicalGroup>
      <ClinicalGroup id="medications" title="Medicações em uso" verified={medications.some(item=>item.name.trim())}
        state={medications.some(item=>item.name.trim())?'Medicações registradas':'Sem informação registrada'}>
        <button type="button" className={`${action} justify-self-start`} onClick={()=>onChange({medications:[...medications,{name:'',dose:'',frequency:'',route:''}]})}>Adicionar medicação</button>
        {medications.map((medication,index)=><div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3">
          {(['name','dose','frequency','route'] as const).map((key,i)=><Input key={key} id={`med-${index}-${key}`} label={`${['Medicamento','Dose','Frequência','Via'][i]} ${index+1}`} className={registrationField} value={medication[key]}
            onChange={event=>onChange({medications:medications.map((row,n)=>n===index?{...row,[key]:event.target.value}:row)})}/>)}
          <button type="button" className={remove} onClick={()=>onChange({medications:medications.filter((_,n)=>n!==index)})}>Remover medicação {index+1}</button>
        </div>)}
      </ClinicalGroup>
      <ClinicalGroup id="conditions" title="Comorbidades" verified={conditionStatus!=='desconhecido'}
        state={conditionStatus==='nao'?'Investigado sem relato':conditionStatus==='sim'?'Condições relatadas':unknown}>
        <div className="grid gap-2 text-sm"><label htmlFor="registration-condition-status">Informação sobre comorbidades</label>
          <select id="registration-condition-status" aria-label="Informação sobre comorbidades" className={registrationField} value={conditionStatus}
            onChange={event=>onChange({comorbidityStatus:event.target.value as RegistrationData['comorbidityStatus']})}>
            <option value="desconhecido">Desconhecida</option><option value="sim">Condições relatadas</option><option value="nao">Investigado, sem relato</option>
          </select>
        </div>
        {conditionStatus==='sim'&&<>
          <button type="button" className={`${action} justify-self-start`} onClick={()=>onChange({conditions:[...conditions,'']})}>Adicionar condição</button>
          {conditions.map((condition,index)=><div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3">
            <Input id={`condition-${index}`} className={registrationField} label={`Condição relatada ${index+1}`} value={condition}
              onChange={event=>onChange({conditions:conditions.map((row,n)=>n===index?event.target.value:row)})}/>
            <button type="button" className={remove} onClick={()=>onChange({conditions:conditions.filter((_,n)=>n!==index)})}>Remover condição {index+1}</button>
          </div>)}
        </>}
      </ClinicalGroup>
    </div>
    <details className="mt-4 border-t border-slate-200 pt-2">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">Antecedentes obstétricos</summary>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['pregnancies','deliveries','cesareans','pregnancyLosses'] as const).map((key,i)=><Input key={key} id={key} type="number" min="0" max="99"
          label={['Gestações anteriores','Partos','Cesáreas','Perdas gestacionais'][i]} className={registrationField} placeholder="Desconhecido" value={data[key]??''}
          onChange={event=>onChange({[key]:event.target.value})}/>)}
      </div>
    </details>
  </section>
}
