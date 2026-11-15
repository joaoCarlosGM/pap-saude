import {z} from 'zod'
import {reviewIdentitySchema} from './review-registry'
import type {DemoState} from './demo/data'
import {seedPatients} from './demo/fixtures'
import type {Patient} from '../types/paciente'
export const DEMO_CARD_PREFIX='PAP-ID-DEMO-1.'
const generatedIdentity=z.object({subject:z.uuid(),name:z.string().regex(/^Gestante Sintética [A-F0-9]{6}$/),birthDate:z.literal('1998-08-14'),document:z.string().regex(/^98\d{9}$/),rg:z.object({number:z.string().regex(/^DEMO-[A-F0-9]{6}$/),uf:z.literal('PA'),issuer:z.literal('DEMO')}).strict().optional()}).strict()
// The sole exception is the closed, already synthetic fixture catalog, never arbitrary people.
const existingIdentity=z.object({subject:z.uuid(),patientId:z.string(),name:z.string(),birthDate:z.iso.date(),document:z.string().regex(/^\d{11}$/),rg:z.object({number:z.string().regex(/^DEMO-[A-F0-9]{6}$/),uf:z.literal('PA'),issuer:z.literal('DEMO')}).strict().optional()}).strict().refine(p=>seedPatients.some(row=>row.id===p.patientId&&row.nome===p.name&&row.dataNascimento===p.birthDate&&row.cpf.replace(/\D/g,'')===p.document),'Only known synthetic fixtures')
export const syntheticIdentitySchema=z.union([generatedIdentity,existingIdentity,reviewIdentitySchema])
export const demoLedgerSchema=z.object({kind:z.literal('PAP_ID_DEMO_V1'),revision:z.number().int().positive(),patient:syntheticIdentitySchema,cards:z.array(z.object({hash:z.string().regex(/^[a-f0-9]{64}$/),expiresAt:z.iso.datetime(),revoked:z.boolean()}).strict()).min(1).max(50)}).strict()
export type SyntheticIdentity=z.infer<typeof syntheticIdentitySchema>
export type DemoLedger=z.infer<typeof demoLedgerSchema>
export async function demoCardHash(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function resolveDemoCard(ledger:DemoLedger|null,token:string,now=Date.now()):Promise<SyntheticIdentity|null>{
 if(!ledger||!/^PAP-ID-DEMO-1\.[A-Za-z0-9_-]{43}$/.test(token))return null
 const digest=await demoCardHash(token),card=ledger.cards.find(c=>c.hash===digest)
 return card&&!card.revoked&&Date.parse(card.expiresAt)>now?ledger.patient:null
}
/** Only creates a synthetic presentation row; never creates an encounter or an operational identity. */
export function addSyntheticIdentity(state:DemoState,identity:SyntheticIdentity):DemoState{
 const p=syntheticIdentitySchema.parse(identity)
 const existing=state.patients.find(row=>row.cpf.replace(/\D/g,'')===p.document)
 if(existing){if(existing.nome!==p.name||existing.dataNascimento!==p.birthDate)throw new Error('Identificação demonstrativa conflitante; revise a base local.');return state}
 const patient:Patient={id:'patientId' in p?p.patientId:`demo-patient-${state.next}`,initials:'GS',nome:p.name,cpf:p.document,sus:'Não informado',dataNascimento:p.birthDate,idade:28,telefone:'Não informado',endereco:'Não informado',pregnancy:{gestationalAge:'Desconhecida',trimester:'Desconhecido',dum:'',dpp:''},historyStatus:'Alergias: desconhecido; comorbidades: desconhecido',allergies:[],comorbidities:[],consultations:0,alerts:0,latestScore:{value:null,classification:'NAO_AVALIADO',date:'2026-10-28'},meowsTrend:[],systolicTrend:[],obstetricHistory:{pregnancies:null,deliveries:null,abortions:null,cesareans:null},timeline:[],exams:[],vaccines:[],documents:[],medications:[],previousNotes:[]}
 return {...state,patients:[...state.patients,patient],next:state.next+1}
}

/** Immutable synthetic identity and global hash ownership across locally imported ledgers. */
export function mergeDemoLedgers(current:DemoLedger[],input:unknown):DemoLedger[]{
 const next=demoLedgerSchema.parse(input),old=current.find(l=>l.patient.subject===next.patient.subject)
 if(old&&(JSON.stringify(old.patient)!==JSON.stringify(next.patient)||next.revision<old.revision||(next.revision===old.revision&&JSON.stringify(next)!==JSON.stringify(old))))throw Error('Base incompatível; identidade e revisão devem ser preservadas.')
 const others=current.filter(l=>l.patient.subject!==next.patient.subject)
 if(others.length>=50||others.some(l=>l.patient.document===next.patient.document||l.cards.some(card=>next.cards.some(c=>c.hash===card.hash))))throw Error('Identidade ou credencial duplicada na base sintética.')
 return [...others,next]
}
