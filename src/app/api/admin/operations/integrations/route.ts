import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdminSession } from "@/server/admin/admin-http";
import { InvalidOperationsQueryError, readOperationsQuery } from "@/server/admin/operations-scope.service";
import { listOperationsIntegrations } from "@/server/admin/operations-integrations.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession(request);
    const query = readOperationsQuery(request.nextUrl, ["page", "organizationId"]);
    const result = await listOperationsIntegrations({ userId: session.user.id, ...query });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof InvalidOperationsQueryError) return NextResponse.json({ error: "INVALID_FILTER" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    return adminErrorResponse(error);
  }
}
