"use client";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
type Item={id:string;createdAt:string;expiresAt:string;lastSeenAt:string;userAgent:string|null;current:boolean};
type Factor={id:string;status:string;createdAt:string};
type Posture={factors:Factor[];remainingRecoveryCodes:number;sessions:Item[]};
export default function MySecurityClient(){
 const router=useRouter();
 const [data,setData]=useState<Posture|null>(null),[error,setError]=useState(""),[password,setPassword]=useState(""),[code,setCode]=useState(""),[newPassword,setNewPassword]=useState(""),[pending,setPending]=useState<{factorId:string;secret:string;provisioningUri:string}|null>(null),[codes,setCodes]=useState<string[]>([]);
 const load=useCallback(async()=>{const r=await fetch("/api/auth/security",{cache:"no-store"});if(!r.ok)throw Error("SESSION");setData(await r.json());},[]);
 useEffect(()=>{
  let cancelled=false;
  void fetch("/api/auth/security",{cache:"no-store"})
   .then(response=>{
    if(!response.ok)throw new Error("SESSION");
    return response.json() as Promise<Posture>;
   })
   .then(posture=>{
    if(!cancelled)setData(posture);
   })
   .catch(()=>{
    if(!cancelled)setError("Sessão indisponível");
   });
  return ()=>{cancelled=true;};
 },[]);
 async function send(action:string,extras:Record<string,string>={}){
  setError("");const r=await fetch("/api/auth/security",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,password,code,...extras})});
  if(!r.ok){setError("Ação não autorizada ou dados inválidos");return;}
  const body=await r.json();
  if(action==="START_MFA")setPending(body);
  if(action==="CONFIRM_MFA")setPending(null);
  if(action==="GENERATE_RECOVERY_CODES")setCodes(body.codes);
  if(body.sessionRevoked){router.replace("/login");return;}
  await load();
 }
 return <section className="mx-auto max-w-3xl space-y-6 p-6">
  <h1 className="text-2xl font-semibold">Segurança da minha conta</h1>
  <p className="text-sm">Ações sensíveis exigem sua senha atual e, quando MFA estiver ativo, o código do autenticador.</p>
  {error&&<p role="alert" className="text-red-600">{error}</p>}
  <div className="grid gap-3"><label>Senha atual<input className="block w-full rounded border p-2" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Código TOTP (quando solicitado)<input className="block w-full rounded border p-2" value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric"/></label><label>Nova senha<input className="block w-full rounded border p-2" type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label></div>
  <div className="flex flex-wrap gap-2"> <button className="rounded border p-2" onClick={()=>void send("CHANGE_PASSWORD",{newPassword})}>Alterar senha e encerrar sessões</button><button className="rounded border p-2" onClick={()=>void send("START_MFA")}>Configurar MFA</button><button className="rounded border p-2" onClick={()=>void send("GENERATE_RECOVERY_CODES")}>Gerar novos códigos de recuperação</button><button className="rounded border p-2" onClick={()=>void send("REVOKE_ALL_SESSIONS")}>Encerrar todas as sessões</button></div>
  {pending&&<div className="rounded border p-4"><h2 className="font-semibold">Configure seu autenticador</h2><p>Registre a chave no aplicativo de autenticação. Esta chave só será exibida agora.</p><code className="block break-all">{pending.secret}</code><p className="break-all text-xs">{pending.provisioningUri}</p><button className="rounded border p-2" onClick={()=>void send("CONFIRM_MFA",{factorId:pending.factorId})}>Confirmar com o código</button></div>}
  {codes.length>0&&<div className="rounded border p-4"><p>Guarde estes códigos fora do dispositivo. Eles serão exibidos uma única vez.</p><ul className="grid grid-cols-2 gap-2">{codes.map(c=><li key={c}><code>{c}</code></li>)}</ul><button onClick={()=>setCodes([])}>Ocultar códigos</button></div>}
  <h2 className="font-semibold">Fatores e recuperação</h2><p>Fatores ativos: {data?.factors.filter(f=>f.status==="ACTIVE").length??0}; códigos não utilizados: {data?.remainingRecoveryCodes??0}</p>
  <h2 className="font-semibold">Sessões recentes</h2><ul>{data?.sessions.map(s=><li className="flex justify-between gap-2 border-b p-2" key={s.id}><span>{s.userAgent??"Dispositivo"} {s.current?"(esta sessão)":""}</span><button onClick={()=>void send("REVOKE_SESSION",{targetSessionId:s.id})}>Revogar</button></li>)}</ul>
 </section>;
}
