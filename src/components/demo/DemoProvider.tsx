'use client'
import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { dashboardFrom, initialDemo, patientViews, saveDemo, type DemoState } from '@/lib/demo/data'
import type { RegistrationData } from '@/types/registration'
const Context=createContext<{state:DemoState;save:(data:RegistrationData)=>void;reset:()=>void}|null>(null)
export function DemoProvider({children}:{children:React.ReactNode}){
 const [state,setState]=useState(initialDemo)
 const ready=useRef<HTMLSpanElement>(null)
 useEffect(()=>{ready.current?.setAttribute("data-demo-ready","true")},[])
 return <Context.Provider value={{state,save:data=>setState(current=>saveDemo(current,data)),reset:()=>setState(initialDemo())}}><span ref={ready} hidden/>{children}</Context.Provider>
}
export function useDemo(){const value=useContext(Context);if(!value)throw Error('Demo provider missing');return {...value,patients:patientViews(value.state),dashboard:dashboardFrom(value.state)}}
export function DemoNotice(){const {reset}=useDemo();return <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Dados demonstrativos · referência 28/10/2026 · sem prontuário real · recarregar descarta as alterações</span><button type="button" className="rounded px-2 py-1 text-pink-600 focus-visible:outline-2" onClick={()=>{if(window.confirm('Restaurar apenas os dados sintéticos desta demonstração?'))reset()}}>Restaurar demonstração</button></div>}
