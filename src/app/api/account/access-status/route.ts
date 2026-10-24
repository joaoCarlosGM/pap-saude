import { NextRequest } from "next/server";
import { ownAccessStatus } from "@/server/access-invitations/access-invitation.service";
import {
  ownAccessSession,
  accessJson,
  accessError,
} from "@/server/access-invitations/access-invitation-http";
import { invalid } from "@/server/admin-beta/policy";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.search) invalid();
    const { user } = await ownAccessSession(request);
    return accessJson({ access: await ownAccessStatus(user.id) });
  } catch (error) {
    return accessError(error);
  }
}
