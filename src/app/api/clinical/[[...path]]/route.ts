import type { NextRequest } from "next/server";

import { handleClinicalApi } from "@/server/http/clinical-api";

import { clinicalErrorResponse } from "@/server/http/clinical-api-response";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function dispatch(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;

    return await handleClinicalApi(request, request.method, params.path ?? []);
  } catch (error) {
    return clinicalErrorResponse(error);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return dispatch(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return dispatch(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return dispatch(request, context);
}
