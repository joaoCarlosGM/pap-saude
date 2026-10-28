import { NextRequest } from "next/server";
import { requireAdminSession, readAdminJson } from "@/server/admin/admin-http";
import {
  assertTrustedRequestOrigin,
  readSessionToken,
} from "@/server/auth/http-auth";
import { betaRateLimit, invalid, uuid } from "@/server/admin-beta/policy";
import {
  accessJson,
  accessError,
  onlyFields,
} from "@/server/access-invitations/access-invitation-http";
import {
  listAccessInvitations,
  createAccessInvitation,
  resendAccessInvitation,
  approveAccessInvitation,
  closeAccessInvitation,
  retryAccessRelease,
} from "@/server/access-invitations/access-invitation.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession(request);
    const current = {
        userId: session.user.id,
        sessionToken: readSessionToken(request)!,
      },
      p = request.nextUrl.searchParams;
    if (
      [...p.keys()].some(
        (k) => !["page", "status", "id"].includes(k) || p.getAll(k).length !== 1,
      )
    )
      invalid();
    return accessJson(
      await listAccessInvitations(
        current,
        Number(p.get("page") || 1),
        p.get("status") ?? undefined,
        p.get("id") ?? undefined,
      ),
    );
  } catch (error) {
    return accessError(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);
    const session = await requireAdminSession(request);
    const current = {
        userId: session.user.id,
        sessionToken: readSessionToken(request)!,
      },
      body = await readAdminJson(request);
    if (
      typeof body.operation !== "string" ||
      ![
        "CREATE",
        "RESEND",
        "APPROVE",
        "REJECT",
        "REVOKE",
        "RETRY_NOTICE",
      ].includes(body.operation)
    )
      invalid();
    await betaRateLimit(
      `access-invitations/${body.operation}`,
      current.userId,
      30,
    );
    if (body.operation === "CREATE") {
      onlyFields(body, [
        "operation",
        "email",
        "displayName",
        "proposedRoleKey",
      ]);
      return accessJson(
        await createAccessInvitation(current, {
          email: body.email,
          displayName: body.displayName,
          proposedRoleKey: body.proposedRoleKey,
        }),
        201,
      );
    }
    const id = uuid(body.id);
    if (body.operation === "APPROVE") {
      onlyFields(body, [
        "operation",
        "id",
        "roleKey",
        "organizationId",
        "reason",
      ]);
      return accessJson(
        await approveAccessInvitation(current, id, {
          roleKey: body.roleKey,
          organizationId: body.organizationId,
          reason: body.reason,
        }),
      );
    }
    if (body.operation === "REJECT" || body.operation === "REVOKE") {
      onlyFields(body, ["operation", "id", "reason"]);
      return accessJson(
        await closeAccessInvitation(current, id, body.operation, body.reason),
      );
    }
    onlyFields(body, ["operation", "id"]);
    return accessJson(
      body.operation === "RESEND"
        ? await resendAccessInvitation(current, id)
        : await retryAccessRelease(current, id),
    );
  } catch (error) {
    return accessError(error);
  }
}
