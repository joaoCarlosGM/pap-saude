import { NextRequest, NextResponse } from "next/server";
import { betaMetrics, csvCell } from "@/server/admin-beta/metrics.service";
import {
  requireBetaSession,
  betaJson,
  betaError,
} from "@/server/admin-beta/http";
import { betaRateLimit } from "@/server/admin-beta/policy";
import {
  operationsPeriod,
  readOperationsQuery,
  InvalidOperationsQueryError,
} from "@/server/admin/operations-scope.service";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const session = await requireBetaSession(request);
    await betaRateLimit("metrics", session.user.id, 120);
    const query = readOperationsQuery(request.nextUrl, [
      "organizationId",
      "from",
      "to",
      "format",
    ]);
    const { start, end } = operationsPeriod(
      request.nextUrl.searchParams.get("from"),
      request.nextUrl.searchParams.get("to"),
    );
    const format = request.nextUrl.searchParams.get("format");
    if (format && format !== "csv") throw new InvalidOperationsQueryError();
    const result = await betaMetrics(
      session.user.id,
      start,
      end,
      query.organizationId,
    );
    if (format === "csv")
      return new NextResponse(
        "\uFEFF" +
          [
            ["dia UTC", "usuários ativos (mínimo 5)"],
            ...result.daily.map((r) => [r.day, r.activeUsers ?? "SUPPRESSED"]),
          ]
            .map((row) => row.map(csvCell).join(","))
            .join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="pap-atividade.csv"',
            "Cache-Control": "no-store",
          },
        },
      );
    return betaJson(result);
  } catch (error) {
    if (error instanceof InvalidOperationsQueryError)
      return betaJson({ error: "INVALID_FILTER" }, 400);
    return betaError(error);
  }
}
