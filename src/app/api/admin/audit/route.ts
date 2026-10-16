import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdminSession } from "@/server/admin/admin-http";
import { InvalidAuditFilterError, listAdminAuditEvents } from "@/server/audit/admin-audit-query.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession(request);
    if (request.nextUrl.search.length > 4096) throw new InvalidAuditFilterError();
    const params = request.nextUrl.searchParams;
    const allowed = ["page", "action", "actorUserId", "organizationId", "resourceType", "resourceId", "outcome", "from", "to"];
    if ([...params.keys()].some(key => !allowed.includes(key)) || allowed.some(key => params.getAll(key).length > 1)) throw new InvalidAuditFilterError();
    const filters = Object.fromEntries(allowed.filter(key => key !== "page" && params.has(key)).map(key => [key, params.get(key)]));
    const page = params.has("page") ? Number(params.get("page")) : 1;
    const result = await listAdminAuditEvents(session.user.id, { ...filters, page });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof InvalidAuditFilterError) return NextResponse.json({ error: "INVALID_AUDIT_FILTER" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    return adminErrorResponse(error);
  }
}
