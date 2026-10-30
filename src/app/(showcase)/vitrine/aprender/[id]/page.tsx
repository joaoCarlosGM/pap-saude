import {notFound} from 'next/navigation';
import {requireCommercialPageSession} from '@/server/demo/commercial-page-session';
import {demoCourses} from '@/features/vitrine-premium/courses/data';
import DemoLearning from '@/features/vitrine-premium/courses/DemoLearning';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){await requireCommercialPageSession();const {id}=await params;if(!demoCourses.some(c=>c.id===id)||Object.keys(await searchParams).length)notFound();return <DemoLearning courseId={id}/>;}
