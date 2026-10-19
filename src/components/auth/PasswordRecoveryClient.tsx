"use client";
import {useEffect,useRef,useState} from "react";
export default function PasswordRecoveryClient({reset=false}:{reset?:boolean}){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState("");
 const tokenRef=useRef("");
 useEffect(()=>{
  if(!reset)return;
  const hash=new URLSearchParams(window.location.hash.slice(1));
  tokenRef.current=hash.get("token")??"";
  window.history.replaceState(
   null,"",window.location.pathname+window.location.search
  );
 },[reset]);
 const send=async()=>{setMessage("");const url=reset?"/api/auth/password/reset":"/api/auth/password/forgot";const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reset?{token:tokenRef.current,newPassword:password}:{email})});
 setMessage(reset?(r.ok?"Senha redefinida. Você pode entrar novamente.":"O link não é válido ou expirou."):"Se a conta existir, você receberá um link por e-mail.");};
 return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><section className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-7"><h1 className="text-2xl font-semibold">{reset?"Redefinir senha":"Recuperar acesso"}</h1><p>Por segurança, não informamos se um e-mail está cadastrado.</p>
 {reset?<label className="block">Nova senha<input type="password" autoComplete="new-password" className="mt-1 block w-full rounded border p-2" value={password} onChange={e=>setPassword(e.target.value)}/></label>:<label className="block">E-mail<input type="email" autoComplete="email" className="mt-1 block w-full rounded border p-2" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {message&&<p role="status">{message}</p>}<button onClick={()=>void send()} className="w-full rounded bg-teal-800 p-2 text-white">{reset?"Confirmar nova senha":"Solicitar link"}</button><a href="/login" className="block text-sm text-teal-700">Voltar ao login</a></section></main>;
}
