"use client";
import {useEffect,useState} from 'react';
import OwnProfileSettings from '@/components/configuracoes/OwnProfileSettings';
type Profile=Parameters<typeof OwnProfileSettings>[0]['initial'];
export default function CommercialProfile(){
 const [profile,setProfile]=useState<Profile|null>(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{const controller=new AbortController();void fetch('/api/account/profile',{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Profile>;}).then(data=>{setProfile(data);setError(false);}).catch(e=>{if(!(e instanceof DOMException&&e.name==='AbortError'))setError(true);});return()=>controller.abort();},[revision]);
 return <section id="perfil" className="commercial-profile" aria-label="Perfil da minha conta" tabIndex={-1}>
  {profile?<OwnProfileSettings initial={profile} headingAs="h2"/>:<div className="workspace-card"><h2>Perfil da minha conta</h2>{error?<p role="alert">Não foi possível carregar seu perfil. <button className="workspace-secondary" onClick={()=>{setError(false);setRevision(r=>r+1);}}>Tentar novamente carregar perfil</button></p>:<p role="status">Carregando dados da sua conta…</p>}</div>}
 </section>;
}
