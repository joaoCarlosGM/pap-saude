import { NextRequest } from "next/server";
import { resolveTrustedClientOrigin } from "@/server/auth/http-auth";
import { issuePasswordReset } from "@/server/auth/password-security.service";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email.service";
import { readSecurityBody,securityFailure,securityJson,stringField,validateOrigin } from "@/server/auth/security-http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest){try{
  validateOrigin(request);
  const origin=resolveTrustedClientOrigin(request);
  const b=await readSecurityBody(request);
  const email=stringField(b,"email",320);
  if(email.includes("@")) await issuePasswordReset({email,origin,deliver:sendPasswordResetEmail});
  return securityJson({accepted:true},202);
}catch(e){return securityFailure(e);}}
