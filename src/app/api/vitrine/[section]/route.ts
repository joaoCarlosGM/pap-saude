import { NextRequest } from "next/server";
import { readSessionToken, assertTrustedRequestOrigin } from "@/server/auth/http-auth";
import { readSecurityBody } from "@/server/auth/security-http";
import { CommercialAccessError, requireCommercialSession } from "@/server/demo/commercial-access.service";
import { demoContent, simulateDemoRegistration } from "@/server/demo/fixtures";
import { isDemoSection } from "@/lib/demo/types";
import { InvalidRequestOriginError } from "@/server/auth/http-auth.errors";
import { AccountSecurityError } from "@/server/auth/account-security.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = {
    params: Promise<{
        section: string;
    }>;
};
function json(value: unknown, status = 200) {
    return Response.json(value, { status, headers: { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", Vary: "Cookie", "X-Content-Type-Options": "nosniff" } });
}
async function context(request: NextRequest, route: Context) {
    await requireCommercialSession(readSessionToken(request));
    if (request.nextUrl.search || request.headers.has("x-organization-id") || request.headers.has("x-tenant-id"))
        throw new Error("INVALID_DEMO_CONTEXT");
    const { section } = await route.params;
    if (!isDemoSection(section))
        throw new Error("INVALID_DEMO_CONTEXT");
    return section;
}
function failure(error: unknown) {
    if (error instanceof CommercialAccessError)
        return json({ error: error.message }, error.status);
    if (error instanceof InvalidRequestOriginError)
        return json({ error: "REQUEST_REJECTED" }, 403);
    if (error instanceof AccountSecurityError || (error instanceof Error && error.message.startsWith("INVALID_DEMO_")))
        return json({ error: "INVALID_DEMO_REQUEST" }, 400);
    // No database/provider exceptions or request contents reach logs or responses.
    console.error("DEMO_REQUEST_FAILED");
    return json({ error: "REQUEST_FAILED" }, 500);
}
export async function GET(request: NextRequest, route: Context) {
    try {
        return json(demoContent(await context(request, route)));
    }
    catch (error) {
        return failure(error);
    }
}
export async function POST(request: NextRequest, route: Context) {
    try {
        assertTrustedRequestOrigin(request);
        const section = await context(request, route);
        if (section !== "registro")
            return json({ error: "METHOD_NOT_ALLOWED" }, 405);
        const body = await readSecurityBody(request);
        if (Object.keys(body).some(k => !["patientId", "kind"].includes(k)))
            throw new Error("INVALID_DEMO_INPUT");
        return json(simulateDemoRegistration(body.patientId, body.kind));
    }
    catch (error) {
        return failure(error);
    }
}
