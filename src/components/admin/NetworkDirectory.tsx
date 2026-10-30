"use client";
import Link from 'next/link';
import {useState} from 'react';
export type DirectoryOrganization={id:string;name:string;type:string;parentId:string|null;status:string};
export default function NetworkDirectory({organizations}:{organizations:DirectoryOrganization[]}){
 const [query,setQuery]=useState('');const q=query.trim().toLocaleLowerCase('pt-BR'),cities=organizations.filter(o=>o.type==='MUNICIPALITY'),units=organizations.filter(o=>o.type==='HEALTH_UNIT');
 const matches=(o:DirectoryOrganization)=>o.name.toLocaleLowerCase('pt-BR').includes(q);
 return <section className="space-y-4"><label className="block text-sm font-medium">Buscar município ou unidade<input type="search" className="mt-2 block min-h-11 w-full rounded-xl border bg-white px-4" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 {cities.filter(c=>matches(c)||units.some(u=>u.parentId===c.id&&matches(u))).map(city=><details key={city.id} open={q?true:undefined} className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer text-lg font-semibold">{city.name} <span className="ml-2 text-sm font-normal">{city.status}</span></summary><ul className="mt-4 space-y-3">{units.filter(u=>u.parentId===city.id&&(matches(city)||matches(u))).map(unit=><li key={unit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><span>{unit.name} · {unit.status}</span><Link href={`/admin/rede/${unit.id}`} className="rounded-lg border px-3 py-2 font-medium">Organização e responsáveis autorizados →</Link></li>)}</ul>{!units.some(u=>u.parentId===city.id)&&<p className="mt-3 text-sm">Nenhuma UBS disponível no seu escopo.</p>}</details>)}
 {units.filter(u=>!cities.some(c=>c.id===u.parentId)&&matches(u)).map(unit=><article key={unit.id} className="rounded-xl border bg-white p-4"><Link className="underline" href={`/admin/rede/${unit.id}`}>{unit.name}</Link> · {unit.status}</article>)}
 {!organizations.some(matches)&&!cities.some(c=>units.some(u=>u.parentId===c.id&&matches(u)))&&<p role="status">Nenhuma organização corresponde à busca no seu escopo autorizado.</p>}
 </section>;
}
