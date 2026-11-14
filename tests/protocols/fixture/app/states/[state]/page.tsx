import {notFound} from 'next/navigation';
import Protocols from '@/features/vitrine-premium/views/protocolos';
export default async function Page({params}:{params:Promise<{state:string}>}){const {state}=await params;if(state==='empty')return <Protocols protocols={[]}/>;if(state==='loading'||state==='error')return <Protocols state={state}/>;notFound()}
