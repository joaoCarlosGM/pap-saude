'use client'
import { createContext, useContext, useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { dashboardFrom, initialDemo, patientViews, saveDemo, type DemoState } from '@/lib/demo/data'
import { editDemoProfile, type DemoProfile } from '@/lib/demo/profile'
import type { RegistrationData } from '@/types/registration'

type DemoContext = {
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
  noticesRequested: boolean
  requestNotices: (open: boolean) => void
  tourIndex: number | null
  setTourIndex: Dispatch<SetStateAction<number | null>>
}
const Context = createContext<DemoContext | null>(null)

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialDemo)
  const [mainMenuOpen, setMainMenuOpen] = useState(false)
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false)
  const [resetRequested, requestReset] = useState(false)
  const [helpRequested, requestHelp] = useState(false)
  const [noticesRequested, requestNotices] = useState(false)
  const [tourIndex, setTourIndex] = useState<number | null>(null)
  const ready = useRef<HTMLSpanElement>(null)
  useEffect(() => { ready.current?.setAttribute('data-demo-ready', 'true') }, [])
  return <Context.Provider value={{
    state, save: data => setState(current => saveDemo(current, data)),
    reset: () => { setState(initialDemo()); setTourIndex(null) },
    updateProfile: patch => setState(current => ({ ...current, profile: editDemoProfile(current.profile, patch) })),
    mainMenuOpen, conversationMenuOpen,
    openMainMenu: () => { setConversationMenuOpen(false); setMainMenuOpen(true) },
    closeMainMenu: () => setMainMenuOpen(false),
    openConversationMenu: () => { setMainMenuOpen(false); setConversationMenuOpen(true) },
    closeConversationMenu: () => setConversationMenuOpen(false),
    resetRequested, requestReset, helpRequested, requestHelp, noticesRequested, requestNotices,
    tourIndex, setTourIndex,
  }}><span ref={ready} hidden />{children}</Context.Provider>
}
export function useDemo() {
  const value = useContext(Context)
  if (!value) throw Error('Demo provider missing')
  return { ...value, patients: patientViews(value.state), dashboard: dashboardFrom(value.state) }
}
