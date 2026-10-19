import { NextRequest } from "next/server";
import { accountSecurityPosture,runOwnSecurityAction } from "@/server/auth/account-security.service";
import { authenticated,readSecurityBody,securityFailure,securityJson,stringField,validateOrigin } from "@/server/auth/security-http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:NextRequest){try{const auth=await authenticated(request);return securityJson(await accountSecurityPosture(auth.user.id,auth.session.id));}catch(e){return securityFailure(e);}}
export async function POST(request:NextRequest){try{
 validateOrigin(request);
 const auth=await authenticated(request);
 const b=await readSecurityBody(request);
 const action=stringField(b,"action",50);
 const r=await runOwnSecurityAction({userId:auth.user.id,sessionId:auth.session.id,action,
   password:typeof b.password==="string"&&b.password.length<=256?b.password:undefined,
   code:typeof b.code==="string"&&b.code.length<=32?b.code:undefined,
   factorId:typeof b.factorId==="string"&&b.factorId.length<=80?b.factorId:undefined,
   targetSessionId:typeof b.targetSessionId==="string"&&b.targetSessionId.length<=80?b.targetSessionId:undefined,
   newPassword:typeof b.newPassword==="string"&&b.newPassword.length<=256?b.newPassword:undefined});
 return securityJson(r);
}catch(e){return securityFailure(e);}}
