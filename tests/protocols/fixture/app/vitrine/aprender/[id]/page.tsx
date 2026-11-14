import {notFound} from 'next/navigation';
import ShowcaseUnavailable from '@/features/vitrine-premium/components/layout/ShowcaseUnavailable';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(id!=='pre-natal')notFound();return <ShowcaseUnavailable feature="Cursos"/>}
