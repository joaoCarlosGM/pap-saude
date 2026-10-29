import {notFound} from 'next/navigation'
import {requireCommercialPageSession} from '@/server/demo/commercial-page-session'
import Patient from '@/features/vitrine-premium/components/pacientes/DemoPatientView'
import {initialDemo} from '@/features/vitrine-premium/lib/demo/data'
export const dynamic='force-dynamic'
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 await requireCommercialPageSession()
 const {id}=await params
 if(Object.keys(await searchParams).length||(!initialDemo().patients.some(p=>p.id===id)&&!/^demo-patient-[1-9]\d*$/.test(id)))notFound()
 return <Patient id={id}/>
}
