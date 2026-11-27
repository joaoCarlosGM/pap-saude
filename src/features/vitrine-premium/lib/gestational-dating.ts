import {civilDate, pregnancyFrom} from './demo/validation'
import type {RegistrationData} from '../types/registration'
import type {Patient} from '../types/paciente'

export type PregnancyDating =
  | {source:'dum'}
  | {source:'ultrasound'; date:string; weeks:string; days:string; exam:string; evidence:string}
  | {source:'due-date'; date:string; origin:string; evidence:string}

export const datingLabels = {dum:'DUM', ultrasound:'Ultrassom/exame', 'due-date':'DPP conhecida'} as const
export const unitTimeZone = 'America/Fortaleza'
const civilFormatter = (timeZone:string) => new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'})
const unitFormatter = civilFormatter(unitTimeZone)

export function unitCivilDay(date: Date = new Date(), timeZone = unitTimeZone): string {
  const parts = (timeZone===unitTimeZone ? unitFormatter : civilFormatter(timeZone)).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function shiftCivilDay(date: string, days: number): string {
  const day = civilDate(date)
  if (!day) throw new RangeError('Invalid civil date')
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

export function resolveDating(data: Pick<RegistrationData,'dum'|'dumUnknown'|'dating'>, reference: string) {
  const dating = data.dating ?? {source:'dum'}
  let start = data.dumUnknown ? '' : data.dum
  if (dating.source === 'ultrasound') {
    if (!civilDate(dating.date) || dating.date > reference || !/^\d{1,2}$/.test(dating.weeks) || !/^[0-6]$/.test(dating.days) || !dating.exam.trim() || !dating.evidence.trim()) return null
    const age = Number(dating.weeks) * 7 + Number(dating.days)
    if (age > 315) return null
    start = shiftCivilDay(dating.date,-age)
  }
  if (dating.source === 'due-date') {
    if (!civilDate(dating.date) || !dating.origin.trim() || !dating.evidence.trim()) return null
    start = shiftCivilDay(dating.date,-280)
  }
  const result = pregnancyFrom(start, reference)
  return result && { ...result, source:dating.source, anchor:start, reference }
}

export function pregnancySnapshot(data: Pick<RegistrationData,'dum'|'dumUnknown'|'dating'>, reference: string): Patient['pregnancy'] | undefined {
  const result = resolveDating(data, reference)
  if (!result) return undefined
  return {
    dum:data.dumUnknown ? '' : data.dum, dpp:result.dueDate,
    gestationalAge:`${result.weeks}s ${result.days}d`, trimester:result.trimester,
    anchor:result.anchor, source:result.source, reference,
  }
}

export function pregnancyAt(pregnancy: Patient['pregnancy'], reference: string): Patient['pregnancy'] {
  const anchor = pregnancy.anchor || pregnancy.dum
  if (!anchor) return pregnancy
  const result = pregnancyFrom(anchor,reference)
  return {...pregnancy, reference, gestationalAge:result ? `${result.weeks}s ${result.days}d` : 'Desconhecida', trimester:result?.trimester ?? 'Desconhecido'}
}
