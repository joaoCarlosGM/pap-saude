'use client'
import {createContext,useContext,type ReactNode} from 'react'
import type {DemoLedger} from '../../lib/pap-id'
export type CardIssue={png:string;ledger:DemoLedger}
export type CardService={ledgers:DemoLedger[];refresh:()=>Promise<DemoLedger[]>;issue:(patientId:string,operationId:string)=>Promise<CardIssue>;revoke:(subject:string)=>Promise<void>}
const Context=createContext<CardService|null>(null)
/** No network implementation in the Vitrine bundle. Only the local private fixture injects one. */
export function CardServiceProvider({service,children}:{service:CardService|null;children:ReactNode}){return <Context.Provider value={service}>{children}</Context.Provider>}
export const useCardService=()=>useContext(Context)
