"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function LoginSecurity(){
 const router=useRouter();
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[newPassword,setNewPassword]=useState(""),[code,setCode]=useState(""),[mode,setMode]=useState<"LOGIN"|"MFA"|"CHANGE">("LOGIN"),[error,setError]=useState("");
 const submit=async()=>{
   setError("");
   const route=mode==="LOGIN"?"/api/auth/login":mode==="MFA"?"/api/auth/mfa/verify":"/api/auth/password/forced-change";
   const payload=mode==="LOGIN"?{email,password}:mode==="MFA"?{code}:{email,currentPassword:password,newPassword,totpCode:code||undefined};
   const response=await fetch(route,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const result=await response.json();
   if(!response.ok){if(result.error==="PASSWORD_CHANGE_REQUIRED"){setMode("CHANGE");return;}setError(result.error==="INVALID_CREDENTIALS"?"Credenciais inválidas":"A solicitação não foi aceita");return;}
   if(result.mfaRequired){setMode("MFA");return;}
   if(mode==="CHANGE"){setMode("LOGIN");setPassword("");setCode("");setError("Senha atualizada. Entre novamente.");return;}
   router.replace("/admin");
 };
 return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-7">
  <h1 className="text-2xl font-semibold">Acesso ao PAP Saúde</h1>
  {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  {mode!=="MFA"&&<><label className="block">E-mail<input type="email" autoComplete="username" className="mt-1 block w-full rounded border p-2" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block">Senha<input type="password" autoComplete="current-password" className="mt-1 block w-full rounded border p-2" value={password} onChange={e=>setPassword(e.target.value)}/></label></>}
  {(mode==="MFA"||mode==="CHANGE")&&<label className="block">{mode==="MFA"?"Código do autenticador ou código de recuperação":"Código MFA, se configurado"}<input className="mt-1 block w-full rounded border p-2" value={code} onChange={e=>setCode(e.target.value)}/></label>}
  {mode==="CHANGE"&&<label className="block">Nova senha<input className="mt-1 block w-full rounded border p-2" type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>}
  <button onClick={()=>void submit()} className="w-full rounded bg-teal-800 p-2 text-white">{mode==="LOGIN"?"Entrar":mode==="MFA"?"Confirmar MFA":"Atualizar senha"}</button>
  <a className="block text-sm text-teal-700" href="/recuperar-senha">Esqueci minha senha</a>
 </div></main>;
}
