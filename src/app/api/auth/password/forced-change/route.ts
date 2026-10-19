import { NextRequest } from "next/server";
import { resolveTrustedClientOrigin } from "@/server/auth/http-auth";
import { changeRequiredPassword } from "@/server/auth/password-security.service";
import { readSecurityBody,securityFailure,securityJson,stringField,validateOrigin } from "@/server/auth/security-http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest){try{
  validateOrigin(request);const origin=resolveTrustedClientOrigin(request);
  const b=await readSecurityBody(request);
  await changeRequiredPassword({email:stringField(b,"email",320),currentPassword:stringField(b,"currentPassword",256),newPassword:stringField(b,"newPassword",256),totpCode:typeof b.totpCode==="string"?stringField(b,"totpCode",32):undefined,origin});
  return securityJson({ok:true});
}catch(e){return securityFailure(e);}}
