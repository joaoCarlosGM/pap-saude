import { NextRequest } from "next/server";
import { ownProfile, ProfileInputError } from "@/server/account/own-profile.service";
import { assertTrustedRequestOrigin, readSessionToken } from "@/server/auth/http-auth";
import { OperationalMfaRequiredError } from "@/server/auth/operational-mfa.service";
import { readSecurityBody, securityJson } from "@/server/auth/security-http";
import { clinicalErrorResponse } from "@/server/http/clinical-api-response";
function failure(error: unknown) {
  if (error instanceof Error && ["InvalidSessionError","ExpiredSessionError","RevokedSessionError","InactiveSessionUserError"].includes(error.name)) return securityJson({error:"UNAUTHENTICATED"},401);
  if (error instanceof ProfileInputError) return securityJson({ error: "INVALID_PROFILE" }, 400);
  if (error instanceof OperationalMfaRequiredError) return securityJson({ error: "MFA_REQUIRED" }, 403);
  return clinicalErrorResponse(error);
}
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { if (request.nextUrl.search) throw new ProfileInputError(); return securityJson(await ownProfile(readSessionToken(request) ?? "")); } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  try { assertTrustedRequestOrigin(request); if (request.nextUrl.search) throw new ProfileInputError(); return securityJson(await ownProfile(readSessionToken(request) ?? "", await readSecurityBody(request))); } catch (error) { return failure(error); }
}
