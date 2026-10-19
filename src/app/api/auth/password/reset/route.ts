import { NextRequest } from "next/server";
import { resolveTrustedClientOrigin } from "@/server/auth/http-auth";
import { consumePasswordReset } from "@/server/auth/password-security.service";
import { readSecurityBody,securityFailure,securityJson,stringField,validateOrigin } from "@/server/auth/security-http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest){try{
  validateOrigin(request);resolveTrustedClientOrigin(request);
  const b=await readSecurityBody(request);
  await consumePasswordReset({token:stringField(b,"token",128),newPassword:stringField(b,"newPassword",256)});
  return securityJson({ok:true});
}catch(e){return securityFailure(e);}}
