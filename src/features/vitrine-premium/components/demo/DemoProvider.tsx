'use client'
import { createContext, useContext, useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { dashboardFrom, initialDemo, patientViews, saveDemo, type DemoState } from '@/features/vitrine-premium/lib/demo/data'
import { editDemoProfile, type DemoProfile } from '@/features/vitrine-premium/lib/demo/profile'
import {normalizeIdentifier} from '../../lib/demo/validation'
import {projectChart} from '../../lib/chart-projection'
import {chartRegistration, type ChartEvent} from '../../lib/longitudinal'
import type {SoapNote} from "../../lib/registration-record"
import type { RegistrationData } from '@/features/vitrine-premium/types/registration'

import {resetAppointments} from '../../lib/demo-agenda'
import {writeDemoPhoto} from '../../lib/demo-photo'
import type {DemoNotice} from '../../lib/demo-notices'
import {useCardService} from './CardServiceContext'
import {addSyntheticIdentity,mergeDemoLedgers,type DemoLedger,type SyntheticIdentity} from '@/features/vitrine-premium/lib/pap-id'

type DemoContext = {
  identityLedger: DemoLedger | null
  identityLedgers: DemoLedger[]
  importIdentityLedger: (ledger: unknown) => void
  registerSyntheticIdentity: (identity: SyntheticIdentity) => void
  state: DemoState
  activity: ChartEvent[]
  save: (data: RegistrationData, operationId: string) => Promise<boolean>
  appendNote: (encounterId: string, note: SoapNote) => Promise<void>
  reset: () => void
  updateProfile: (patch: Partial<DemoProfile>) => void
  mainMenuOpen: boolean
  conversationMenuOpen: boolean
  openMainMenu: () => void
  closeMainMenu: () => void
  openConversationMenu: () => void
  closeConversationMenu: () => void
  resetRequested: boolean
  requestReset: (open: boolean) => void
  helpRequested: boolean
  requestHelp: (open: boolean) => void
  notices: DemoNotice[]
  readNotices: string[]
  publishNotice: (notice: DemoNotice) => void
  markNoticesRead: (ids: string[]) => void
  noticesRequested: boolean
  requestNotices: (open: boolean) => void
  tourIndex: number | null
  setTourIndex: Dispatch<SetStateAction<number | null>>
}
const Context = createContext<DemoContext | null>(null)
function initialShowcaseState() {
  const state = initialDemo()
  return {...state, profile: editDemoProfile(state.profile, {name: 'Ana Paula Ferreira'})}
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const registry=useCardService()
  const [state, setState] = useState(initialShowcaseState)
  const hydrate = (value:DemoState) => (registry?.people ?? []).reduce((current,identity) => {
    if (!('patientId' in identity)) return current
    const local = current.patients.find(patient => patient.id !== identity.patientId && normalizeIdentifier(patient.cpf) === identity.document)
    if (local?.id.startsWith('demo-patient-')) {
      // A local demonstration with the same number must not become the authorized subject's history.
      const separate = {...current,patients:current.patients.filter(patient => patient.id !== local.id),
        encounters:current.encounters.filter(visit => visit.paciente.id !== local.id)}
      return addSyntheticIdentity(separate,identity)
    }
    return addSyntheticIdentity(current,identity)
  },value)
  const authorized = new Set(registry?.people.flatMap(person => 'patientId' in person ? [person.patientId] : []) ?? [])
  const permitted = (id: string) => !id.startsWith('review-') || authorized.has(id)
  const visible = hydrate(state)
  const chart = registry?.chart
  const [activity,setActivity] = useState<ChartEvent[]>([])
  useEffect(() => {
    if (!chart) return
    let active = true
    let request = 0
    const refresh = () => {
      const version = ++request
      void chart.activity().then(events => {
        if (active && version === request) setActivity(events)
      }).catch(() => {
        if (active && version === request) setActivity([])
      })
    }
    window.addEventListener('pap:vitrine-chart',refresh)
    refresh()
    return () => {active = false; window.removeEventListener('pap:vitrine-chart',refresh)}
  }, [chart])
  const durableActivity = chart ? activity.filter(event => authorized.has(event.patientId)) : []
  const views = patientViews(visible)
  const durableEncounters = views.flatMap(patient => {
    const events = durableActivity.filter(event => event.patientId === patient.id && ['consulta','soap'].includes(event.data.kind))
    if (!events.length) return []
    const ids = new Set(events.map(event => event.entityId))
    return projectChart(patient,events).encounters?.filter(encounter => ids.has(encounter.id)) ?? []
  })
  const durableIds = new Set(durableEncounters.map(visit => visit.id))
  const merged = [...visible.encounters.filter(visit => !durableIds.has(visit.id)), ...durableEncounters]
  const [identityLedgers,setIdentityLedgers]=useState<DemoLedger[]>([])
  const ledgerRef=useRef<DemoLedger[]>([])
  const identityLedger=identityLedgers.at(-1)||null
  const [mainMenuOpen, setMainMenuOpen] = useState(false)
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false)
  const [resetRequested, requestReset] = useState(false)
  const [helpRequested, requestHelp] = useState(false)
  const [notices,setNotices]=useState<DemoNotice[]>([])
  const [readNotices,setReadNotices]=useState<string[]>([])
  const [noticesRequested, requestNotices] = useState(false)
  const [tourIndex, setTourIndex] = useState<number | null>(null)
  const ready = useRef<HTMLSpanElement>(null)
  useEffect(() => { ready.current?.setAttribute('data-demo-ready', 'true') }, [])
  return <Context.Provider value={{
    identityLedger,identityLedgers,importIdentityLedger: data=>{const next=mergeDemoLedgers(ledgerRef.current,data);ledgerRef.current=next;setIdentityLedgers(next)},registerSyntheticIdentity: identity=>{
      setState(current=>{
        const next=addSyntheticIdentity(current,identity)
        if (next===current || 'patientId' in identity) return next
        return {...next, patients: next.patients.map(patient =>
          patient.id===`demo-patient-${current.next}` ? {...patient, agendaIdentity: identity.subject} : patient)}
      })
    },
    activity:durableActivity, state:{...visible,patients:visible.patients.filter(patient => permitted(patient.id)),encounters:merged.filter(visit => permitted(visit.paciente.id))}, save: async (data,operationId) => {
      const identity = registry?.people.find(person => 'patientId' in person && person.document === normalizeIdentifier(data.cpf))
      const recorded = {at: new Date().toISOString(), agendaIdentity: crypto.randomUUID(), encounterId:undefined as string | undefined}
      const patientId = identity && 'patientId' in identity ? identity.patientId : null
      if (patientId && registry?.chart && identity) {
        if (data.nomeCompleto.trim() !== identity.name || data.dataNascimento !== identity.birthDate) throw Error('IDENTITY_CONFLICT')

        const {cpf, nomeCompleto, dataNascimento, edemaProvenance, ...fields} = data
        void [cpf,nomeCompleto,dataNascimento,edemaProvenance]
        const result = await registry.chart.write(patientId, {
          operationId,entityId:operationId,expectedVersion:0,data:{kind:'consulta',record:chartRegistration.parse(fields)},
        })
        recorded.at = result.recordedAt
        recorded.encounterId = operationId
      }
      setState(current => current.encounters.some(encounter => encounter.id === operationId) ? current : saveDemo(hydrate(current), data, recorded))
      return !!(patientId && registry?.chart)
    },
    appendNote: async (encounterId, note) => {
      const encounter = merged.find(item => item.id === encounterId)
      const patientId = encounter?.paciente.id
      if (patientId?.startsWith('review-')) {
        if (!registry?.chart || !registry.people.some(person => 'patientId' in person && person.patientId === patientId)) throw Error('CHART_UNAVAILABLE')
        await registry.chart.write(patientId,{operationId:note.id,entityId:note.id,expectedVersion:0,
          data:{kind:'soap',encounterId,author:note.author,content:note.content}})
      }
      setState(current => ({
        ...current,
        encounters: current.encounters.map(encounter => {
          const record = encounter.registration
          return encounter.id === encounterId && record && !record.soapNotes?.some(entry => entry.id === note.id)
            ? {...encounter, registration: {...record, soapNotes: [...(record.soapNotes ?? []), note]}}
            : encounter
        }),
      }))
    },
    reset: () => { setState(initialShowcaseState());setIdentityLedgers([]);ledgerRef.current=[]; setTourIndex(null);setNotices([]);setReadNotices([]);try{writeDemoPhoto('')}catch{} void resetAppointments().catch(()=>{}); window.dispatchEvent(new Event('pap:vitrine-reset')) },
    updateProfile: patch => setState(current => ({ ...current, profile: editDemoProfile(current.profile, patch) })),
    mainMenuOpen, conversationMenuOpen,
    openMainMenu: () => { setConversationMenuOpen(false); setMainMenuOpen(true) },
    closeMainMenu: () => setMainMenuOpen(false),
    openConversationMenu: () => { setMainMenuOpen(false); setConversationMenuOpen(true) },
    closeConversationMenu: () => setConversationMenuOpen(false),
    resetRequested, requestReset, helpRequested, requestHelp, noticesRequested, requestNotices,
    notices, readNotices,
    publishNotice: notice => setNotices(current => current.some(item => item.id === notice.id) ? current : [...current, notice]),
    markNoticesRead: ids => setReadNotices(current => Array.from(new Set([...current, ...ids]))),
    tourIndex, setTourIndex,
  }}><span ref={ready} hidden />{children}</Context.Provider>
}
export function useDemo() {
  const value = useContext(Context)
  if (!value) throw Error('Demo provider missing')
  return { ...value, patients: patientViews(value.state), dashboard: dashboardFrom(value.state) }
}
