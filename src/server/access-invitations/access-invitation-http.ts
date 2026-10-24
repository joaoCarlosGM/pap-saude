import { NextRequest, NextResponse } from "next/server";
import { betaError } from "@/server/admin-beta/http";
import { PasswordPolicyError } from "@/server/auth/auth.errors";
import { InvalidSessionError } from "@/server/auth/session.errors";
import { readSessionToken } from "@/server/auth/http-auth";
import { validateSession } from "@/server/auth/session.service";
import { AccessInvitationError } from "./access-invitation.errors";

export function accessJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function accessError(error: unknown) {
  if (error instanceof AccessInvitationError)
    return accessJson({ error: error.code }, error.status);
  if (error instanceof PasswordPolicyError)
    return accessJson({ error: "INVALID_PASSWORD" }, 400);
  return betaError(error);
}
export async function ownAccessSession(request: NextRequest) {
  const token = readSessionToken(request);
  if (!token) throw new InvalidSessionError();
  return validateSession(token, { updateLastSeen: false });
}
export function onlyFields(body: Record<string, unknown>, fields: string[]) {
  if (Object.keys(body).some((key) => !fields.includes(key)))
    throw new Error("INVALID_ADMIN_PAYLOAD");
}
