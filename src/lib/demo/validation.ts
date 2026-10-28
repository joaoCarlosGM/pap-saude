// All calculations are civil dates at UTC midnight, never clinical scoring.
export const DEMO_DATE = '2026-10-28'
const DAY = 86_400_000
export function civilDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value ? date : null
}
export function pregnancyFrom(dum: string, reference = DEMO_DATE) {
  const start = civilDate(dum), now = civilDate(reference)
  if (!start || !now || +start > +now || (+now - +start) / DAY > 315) return null
  const total = Math.floor((+now - +start) / DAY), weeks = Math.floor(total / 7)
  return { weeks, days: total % 7, dueDate: new Date(+start + 280 * DAY).toISOString().slice(0,10), trimester: `${weeks < 14 ? 1 : weeks < 28 ? 2 : 3}º trimestre` }
}
export const normalizeIdentifier = (value: string) => value.replace(/\D/g,'')
export function validDemoIdentifier(value: string) {
  const digits = normalizeIdentifier(value)
  return digits.length === 11 && !/^(\d)\1{10}$/.test(digits)
}

export function formatDemoDate(value:string){const date=civilDate(value);return date?date.toLocaleDateString('pt-BR',{timeZone:'UTC'}):'Desconhecida'}
