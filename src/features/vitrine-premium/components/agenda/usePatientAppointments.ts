'use client'

import {agendaPatient, journalAppointments, useAppointments, type Appointment} from '../../lib/demo-agenda'
import {scenarioAppointments} from '../../lib/scenario-appointments'
import type {Patient} from '../../types/paciente'
import {useCardService} from '../demo/CardServiceContext'
import {useLongitudinal} from '../pacientes/LongitudinalContext'

export type PatientAppointment = Appointment & {origin: 'Laboratório privado' | 'Demonstração local' | 'Exemplo do cenário'}

export default function usePatientAppointments(patient: Patient): PatientAppointment[] {
  const local = useAppointments()
  const target = agendaPatient(patient,useCardService()?.people)
  const chart = useLongitudinal()
  if (!target) return []
  const items = new Map<string,PatientAppointment>()
  for (const item of scenarioAppointments(patient)) items.set(item.id,{...item,origin:'Exemplo do cenário'})
  for (const item of local.filter(item => item.patient.key === target.key)) items.set(item.id,{...item,origin:'Demonstração local'})
  if (chart?.enabled) {
    for (const item of journalAppointments(chart.snapshot.events,target)) items.set(item.id,{...item,origin:'Laboratório privado'})
  }
  return [...items.values()]
}
