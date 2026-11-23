'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import ProtocolList,{type LibraryState} from '@/features/vitrine-premium/components/protocolos/ProtocolList'
import ProtocolDetail from '@/features/vitrine-premium/components/protocolos/ProtocolDetail'
import {demoProtocols,emptyProtocolFilters,type DemoProtocol,type ProtocolLocation} from '@/features/vitrine-premium/lib/protocol-catalog'
import styles from '@/features/vitrine-premium/components/protocolos/protocols.module.css'

export default function ProtocolosPage({location={view:'library'},protocols=demoProtocols,state='ready'}:{location?:ProtocolLocation;protocols?:readonly DemoProtocol[];state?:LibraryState}){
 const [filters,setFilters]=useState({...emptyProtocolFilters}),[marks,setMarks]=useState<Record<string,string[]>>({})
 useEffect(()=>{const reset=()=>{setMarks({});setFilters({...emptyProtocolFilters})};window.addEventListener('pap:vitrine-reset',reset);return()=>window.removeEventListener('pap:vitrine-reset',reset)},[])
 const selected=location.view==='detail'?protocols.find(p=>p.slug===location.slug):undefined
 return <div className={styles.page}>
  {selected&&location.view==='detail'?<ProtocolDetail key={selected.slug} protocol={selected} tab={location.tab} initialPage={location.page} marks={marks[selected.slug]||[]} onMark={id=>setMarks(prev=>{const current=prev[selected.slug]||[];return {...prev,[selected.slug]:current.includes(id)?current.filter(x=>x!==id):[...current,id]}})} onClear={()=>setMarks(prev=>({...prev,[selected.slug]:[]}))}/>:<>
   <header className={styles.head}><div><p className={styles.eyebrow}>PAP-PROTOCOLS • VITRINE</p><h1>Protocolos</h1><p className={styles.muted}>Biblioteca de protocolos clínicos • referências em preparação</p></div></header>
   {location.view==='detail'?<div className={styles.empty} role="alert"><h2>Protocolo não encontrado nesta biblioteca</h2><Link className={styles.button} href="/vitrine/protocolos" prefetch={false}>Voltar à biblioteca</Link></div>:<ProtocolList protocols={protocols} filters={filters} onFiltersChange={setFilters} state={state}/>}
  </>}
 </div>
}
