import { NextRequest,NextResponse } from "next/server";
import { assertTrustedRequestOrigin } from "./http-auth";
import { requireHttpSession } from "@/server/http/http-auth.guard";
import { AccountSecurityError } from "./account-security.service";
import { PasswordSecurityError } from "./password-security.service";
import { PasswordPolicyError } from "./auth.errors";

export function securityJson(body:unknown,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store, max-age=0","Referrer-Policy":"no-referrer"}});}
export async function readSecurityBody(request:Request):Promise<Record<string,unknown>>{
  if(!(request.headers.get("content-type")??"").toLowerCase().startsWith("application/json")) throw new AccountSecurityError("INVALID_BODY");
  const declared=request.headers.get("content-length");
  if(declared && (!Number.isFinite(Number(declared)) || Number(declared)>8192 || Number(declared)<0)) throw new AccountSecurityError("INVALID_BODY");
  // Enforce the byte cap while reading, not after buffering an untrusted body.
  if(!request.body) throw new AccountSecurityError("INVALID_BODY");
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];
  let received=0;
  while(true){
    const {done,value}=await reader.read();
    if(done) break;
    received+=value.byteLength;
    if(received>8192){
      await reader.cancel().catch(()=>undefined);
      throw new AccountSecurityError("INVALID_BODY");
    }
    chunks.push(value);
  }
  const text=Buffer.concat(chunks.map(c=>Buffer.from(c))).toString("utf8");
  let value:unknown;
  try{value=JSON.parse(text);}catch{throw new AccountSecurityError("INVALID_BODY");}
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new AccountSecurityError("INVALID_BODY");
  return value as Record<string,unknown>;
}
export function authenticated(request:NextRequest){return requireHttpSession(request);}
export function validateOrigin(request:Request){assertTrustedRequestOrigin(request);}
export function securityFailure(error:unknown){
  if(error instanceof PasswordPolicyError || error instanceof AccountSecurityError) return securityJson({error:"INVALID_REQUEST"},400);
  if(error instanceof PasswordSecurityError) return securityJson({error:error.kind==="THROTTLED"?"TRY_LATER":"INVALID_REQUEST"},error.kind==="THROTTLED"?429:400);
  const name=error instanceof Error?error.name:"";
  if(name==="HttpAuthenticationRequiredError") return securityJson({error:"UNAUTHENTICATED"},401);
  if(name==="InvalidRequestOriginError" || name==="UntrustedClientOriginError") return securityJson({error:"REQUEST_REJECTED"},403);
  if(name.startsWith("InvalidTotp") || name.startsWith("TotpReplay") || name.startsWith("Mfa") || name.startsWith("InvalidRecovery")) return securityJson({error:"INVALID_MFA_CODE"},400);
  return securityJson({error:"INTERNAL_ERROR"},500);
}
export function stringField(body:Record<string,unknown>,key:string,max=256):string{
  const value=body[key];
  if(typeof value!=="string" || !value || value.length>max) throw new AccountSecurityError("INVALID_FIELD");
  return value;
}
