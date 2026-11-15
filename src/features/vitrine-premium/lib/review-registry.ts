import {z} from 'zod'
export const invalidSyntheticCpf=(value:string)=>{if(!/^98\d{9}$/.test(value))return false;const d=[...value].map(Number);const digit=(n:number)=>{const sum=d.slice(0,n).reduce((a,v,i)=>a+v*(n+1-i),0);return (sum*10)%11%10};return d[9]!==digit(9)||d[10]!==digit(10)}
export const reviewPatientInput=z.object({name:z.string().trim().min(20).max(80).regex(/^Gestante Sintética [\p{L}\p{N} .'-]{2,60}$/u),birthDate:z.iso.date().refine(d=>d>='1900-01-01'&&d<'2026-10-28'),document:z.string().refine(invalidSyntheticCpf,'Use documento fictício de11 dígitos iniciado por98 e com verificador inválido.'),syntheticConsent:z.literal(true)}).strict()
export type ReviewPatientInput=z.infer<typeof reviewPatientInput>
export const reviewIdentitySchema=z.object({kind:z.literal('PAP_ID_REVIEW_PERSON_V2'),subject:z.uuid(),patientId:z.string().regex(/^review-[a-f0-9-]{36}$/),name:reviewPatientInput.shape.name,birthDate:reviewPatientInput.shape.birthDate,document:reviewPatientInput.shape.document,rg:z.object({number:z.string().regex(/^DEMO-[A-F0-9]{6}$/),uf:z.literal('PA'),issuer:z.literal('DEMO')}).strict()}).strict().refine(p=>p.patientId==='review-'+p.subject)
export type ReviewIdentity=z.infer<typeof reviewIdentitySchema>
export type ReviewCard={id:string;patientId:string;issuedAt:string|null;expiresAt:string;revoked:boolean;revokedAt:string|null;url:string|null;downloadUrl:string|null}
export type ReviewAttachment={id:string;groupId:string;patientId:string;name:string;category:string;version:number;bytes:number;sha256:string;pages:number;createdAt:string;archived:boolean;url:string;downloadUrl:string}
export const documentCategories=['EXAME_DEMONSTRATIVO','REFERENCIA_EDUCATIVA','OUTRO_SINTETICO'] as const
export const documentLabel=(category:string)=>({EXAME_DEMONSTRATIVO:'Exame demonstrativo',REFERENCIA_EDUCATIVA:'Referência educativa',OUTRO_SINTETICO:'Outro documento sintético'}[category]||category)
