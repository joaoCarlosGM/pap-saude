import type {Appointment} from './demo-agenda'
import {shiftCivilDay} from './gestational-dating'
import type {Patient} from '../types/paciente'

const visits = [
  ['consulta',2,'08:30','Acompanhamento pré-natal'],
  ['exame',4,'10:00','Exame de acompanhamento'],
  ['vacinacao',7,'09:30','Revisão do esquema vacinal'],
] as const

/** Read-only sample appointments. They are never added to browser storage or the private journal. */
export function scenarioAppointments(patient: Patient): Appointment[] {
  const reference=patient.scenarioReference
  if (!reference || patient.id.startsWith('review-')) return []
  return visits.map(([kind,offset,time,reason])=>{
    const id=`scenario-${patient.id}-${kind}`
    const slot={date:shiftCivilDay(reference,offset),time}
    const status='planejado'
    return {id,patient:{id:patient.id,key:patient.id,name:patient.nome},kind,status,slot,reason,
      professional:'Equipe pré-natal',unit:'UBS do cenário',
      events:[{id:id+'-created',at:reference+'T12:00:00Z',actor:'Cenário da Vitrine',action:'criado',status,slot}]}
  })
}
