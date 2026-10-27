import { NextRequest } from "next/server";
import { assertTrustedRequestOrigin, readSessionToken } from "@/server/auth/http-auth";
import { InvalidRequestOriginError } from "@/server/auth/http-auth.errors";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import { clinicalRegistrationService, RegistrationOperationError } from "@/server/clinical-registration/registration.service";
import { RegistrationInputError } from "@/server/clinical-registration/registration.validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", Vary: "Cookie" } });
}
function identity(request: NextRequest) {
  if (request.nextUrl.search) throw new RegistrationInputError();
  const sessionToken = readSessionToken(request);
  if (!sessionToken) throw new RegistrationOperationError("AUTHENTICATION_REQUIRED", 401);
  return { sessionToken, organizationId: request.headers.get("x-organization-id") ?? "", operationKey: request.headers.get("idempotency-key") ?? "" };
}
async function payload(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RegistrationInputError();
  const length = request.headers.get("content-length");
  if (length && (!Number.isFinite(Number(length)) || Number(length) < 0 || Number(length) > 65_536)) throw new RegistrationInputError();
  const reader = request.body?.getReader();
  if (!reader) throw new RegistrationInputError();
  const chunks: Uint8Array[] = []; let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > 65_536) { await reader.cancel(); throw new RegistrationInputError(); }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks.map(v => Buffer.from(v))).toString("utf8")); }
    catch { throw new RegistrationInputError(); }
  } finally { reader.releaseLock(); }
}
function failure(error: unknown) {
  if (error instanceof InvalidRequestOriginError) return json({ error: "REQUEST_REJECTED" }, 403);
  if (error instanceof AccessDeniedError) return json({ error: "ACCESS_DENIED" }, 403);
  if (error instanceof RegistrationInputError) return json({ error: "REGISTRATION_INVALID_INPUT" }, 400);
  if (error instanceof RegistrationOperationError) return json({ error: error.code }, error.status);
  // Neither domain values, database exceptions nor request contents enter logs.
  console.error("CLINICAL_REGISTRATION_UNAVAILABLE");
  return json({ error: "REGISTRATION_UNAVAILABLE" }, 503);
}
export async function POST(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);
    const actor = identity(request);
    const result = await clinicalRegistrationService.submit({ ...actor, payload: await payload(request) });
    return json(result, result.replayed ? 200 : 201);
  } catch (error) { return failure(error); }
}
export async function GET(request: NextRequest) {
  try { return json(await clinicalRegistrationService.status(identity(request))); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);
    return json(await clinicalRegistrationService.cancel(identity(request)));
  } catch (error) { return failure(error); }
}
