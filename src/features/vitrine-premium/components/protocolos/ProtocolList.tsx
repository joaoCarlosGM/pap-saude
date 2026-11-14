'use client'
import Link from 'next/link'
import {useId} from 'react'
import {FileSearch,Search,ShieldAlert} from 'lucide-react'
import ProtocolCard from './ProtocolCard'
import {emptyProtocolFilters,filterProtocols,type DemoProtocol,type ProtocolFilters} from '@/features/vitrine-premium/lib/protocol-catalog'
import styles from './protocols.module.css'

export type LibraryState='ready'|'loading'|'error'
export default function ProtocolList({protocols,filters,onFiltersChange,state='ready'}:{protocols:readonly DemoProtocol[];filters:ProtocolFilters;onFiltersChange:(filters:ProtocolFilters)=>void;state?:LibraryState}){
 const filterId=useId()
 if(state==='loading')return <div aria-busy="true"><p role="status" className={styles.muted}>Carregando biblioteca de protocolos…</p><div className={styles.loader} aria-hidden="true">{[0,1,2].map(n=><div className={styles.skeleton} key={n}/>)}</div></div>
 if(state==='error')return <div className={styles.empty} role="alert"><ShieldAlert size={32} aria-hidden="true"/><h2>Catálogo indisponível</h2><p className={styles.muted}>Não foi possível apresentar os dados da biblioteca. Nenhum documento foi disponibilizado.</p><Link href="/vitrine/protocolos" prefetch={false} className={styles.button}>Reabrir biblioteca</Link></div>
 const found=filterProtocols(protocols,filters),options=(field:'theme'|'origin'|'version')=>Array.from(new Set(protocols.map(p=>p[field])))
 return <div data-tour="resources">
  <div className={styles.filters}>
   <label className={styles.field}>Pesquisar protocolos<input type="search" placeholder="Título, assunto ou código" value={filters.query} onChange={e=>onFiltersChange({...filters,query:e.target.value})}/></label>
   {([{field:'theme',label:'Tema',all:'Todos os temas'},{field:'origin',label:'Origem informada',all:'Todas as origens'},{field:'version',label:'Versão informada',all:'Todas as versões'}] as const).map(({field,label,all})=><label className={styles.field} key={field}><span id={filterId+field}>{label}</span><select aria-labelledby={filterId+field} value={filters[field]} onChange={e=>onFiltersChange({...filters,[field]:e.target.value})}><option value="">{all}</option>{options(field).map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}
  </div>
  <div className={styles.result}><p role="status" aria-live="polite">{found.length} de {protocols.length} referências em preparação</p><button className={styles.textLink} type="button" onClick={()=>onFiltersChange({...emptyProtocolFilters})}>Limpar filtros</button></div>
  {found.length?<div className={styles.cards}>{found.map(p=><ProtocolCard key={p.slug} protocol={p}/>)}</div>:<div className={styles.empty}><FileSearch size={36} aria-hidden="true"/><h2>{protocols.length?'Nenhum protocolo encontrado':'Nenhum documento em preparação'}</h2><p className={styles.muted}>{protocols.length?'Tente outro termo ou limpe os filtros.':'A biblioteca ainda não possui referências disponíveis para demonstração.'}</p>{protocols.length>0&&<Search size={20} aria-hidden="true"/>}</div>}
 </div>
}
