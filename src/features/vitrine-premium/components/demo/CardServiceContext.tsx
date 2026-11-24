'use client'
import {createContext,useContext,type ReactNode} from 'react'
import type {DemoLedger,SyntheticIdentity} from '../../lib/pap-id'
import type {ReviewCard,ReviewAttachment,ReviewPatientInput} from '../../lib/review-registry'
import type {ChartSnapshot,ChartCommand,ChartEvent} from '../../lib/longitudinal'
export type ChartService={activity:()=>Promise<ChartEvent[]>;read:(id:string)=>Promise<ChartSnapshot>;write:(id:string,command:ChartCommand)=>Promise<ChartEvent>}
export type CardIssue={png:string;ledger:DemoLedger}
export type CardService={chart?:ChartService;ledgers:DemoLedger[];people:SyntheticIdentity[];history:ReviewCard[];refresh:()=>Promise<DemoLedger[]>;issue:(patientId:string,operationId:string)=>Promise<CardIssue>;revoke:(subject:string)=>Promise<void>;create:(input:ReviewPatientInput,operationId:string)=>Promise<SyntheticIdentity>;documents:(patientId:string)=>Promise<ReviewAttachment[]>;upload:(patientId:string,file:File,category:string,operationId:string,groupId?:string)=>Promise<void>;archive:(patientId:string,id:string)=>Promise<void>}
const Context=createContext<{service:CardService|null;pending:boolean}>({service:null,pending:false})
/** The private fixture is the only network adapter. The public Vitrine receives no capability. */
export function CardServiceProvider({service,pending=false,children}:{service:CardService|null;pending?:boolean;children:ReactNode}){return <Context.Provider value={{service,pending}}>{children}</Context.Provider>}
export const useCardService=()=>useContext(Context).service
export const useCardRegistryPending=()=>useContext(Context).pending
