import { db } from "@/server/db/client";
import { NextRequest } from "next/server";
import { assertTrustedRequestOrigin } from "@/server/auth/http-auth";
import { readAdminJson } from "@/server/admin/admin-http";
import { uuid, invalid } from "@/server/admin-beta/policy";
import {
  ownAccessSession,
  accessJson,
  accessError,
  onlyFields,
} from "@/server/access-invitations/access-invitation-http";
import {
  ownNotifications,
  markOwnNotificationRead,
} from "@/server/notifications/notification.service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.search) invalid();
    const { user } = await ownAccessSession(request);
    const [notifications,unread]=await Promise.all([ownNotifications(user.id),db.userNotification.count({where:{userId:user.id,readAt:null}})]);
    return accessJson({ notifications,unread });
  } catch (error) {
    return accessError(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);
    if (request.nextUrl.search) invalid();
    const { user } = await ownAccessSession(request),
      body = await readAdminJson(request);
    onlyFields(body, ["id"]);
    const found = await markOwnNotificationRead(user.id, uuid(body.id));
    return accessJson(
      found ? { read: true } : { error: "NOTIFICATION_NOT_FOUND" },
      found ? 200 : 404,
    );
  } catch (error) {
    return accessError(error);
  }
}
