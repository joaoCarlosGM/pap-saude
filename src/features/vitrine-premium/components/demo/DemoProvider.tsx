'use client'
import { createContext, useContext, useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { dashboardFrom, initialDemo, patientViews, saveDemo, type DemoState } from '@/features/vitrine-premium/lib/demo/data'
import { editDemoProfile, type DemoProfile } from '@/features/vitrine-premium/lib/demo/profile'
import type { RegistrationData } from '@/features/vitrine-premium/types/registration'

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
  save: (data: RegistrationData) => void
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
  const hydrate=(value:DemoState)=>(registry?.people||[]).reduce((current,identity)=>addSyntheticIdentity(current,identity),value)
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
    identityLedger,identityLedgers,importIdentityLedger: data=>{const next=mergeDemoLedgers(ledgerRef.current,data);ledgerRef.current=next;setIdentityLedgers(next)},registerSyntheticIdentity: identity=>setState(current=>addSyntheticIdentity(current,identity)),
    state:hydrate(state), save: data => setState(current => saveDemo(hydrate(current), data)),
    reset: () => { setState(initialShowcaseState());setIdentityLedgers([]);ledgerRef.current=[]; setTourIndex(null);setNotices([]);setReadNotices([]);try{writeDemoPhoto('')}catch{} window.dispatchEvent(new Event('pap:vitrine-reset')) },
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
