import { randomUUID, randomBytes } from "node:crypto";
import { db } from "../../src/server/db/client";
import { hashPassword } from "../../src/server/auth/password";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createSession } from "../../src/server/auth/session.service";
import * as security from "../../src/app/api/auth/security/route";
import { NextRequest } from "next/server";
const origin = "http://127.0.0.1:3110";
function request(
  token: string,
  action: string,
  extras: Record<string, unknown>,
) {
  return new NextRequest(origin + "/api/auth/security", {
    method: "POST",
    headers: {
      cookie: `pap_session=${token}`,
      origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...extras }),
  });
}
export async function fixture(
  role: "PAP_ADMIN" | "HEALTH_UNIT_ADMIN" | "PROFESSIONAL" = "PAP_ADMIN",
) {
  const password = randomBytes(24).toString("base64url");
  const user = await db.user.create({
    data: {
      email: `${randomUUID()}@synthetic.invalid`,
      displayName: "Pessoa sintética",
    },
  });
  await db.passwordCredential.create({
    data: {
      userId: user.id,
      passwordHash: await hashPassword(password),
      algorithm: "ARGON2ID",
    },
  });
  const pap = await db.organization.create({
    data: { name: "PAP sintético", type: "PAP", status: "ACTIVE" },
  });
  const city = await db.organization.create({
    data: {
      name: "Município sintético",
      type: "MUNICIPALITY",
      parentId: pap.id,
      status: "ACTIVE",
    },
  });
  const unit = await db.organization.create({
    data: {
      name: "UBS sintética",
      type: "HEALTH_UNIT",
      parentId: city.id,
      status: "ACTIVE",
    },
  });
  if (role !== "PAP_ADMIN")
    await db.membership.create({
      data: { userId: user.id, organizationId: unit.id, status: "ACTIVE" },
    });
  await assignSystemRole({
    userId: user.id,
    roleKey: role,
    ...(role === "PAP_ADMIN" ? {} : { organizationId: unit.id }),
  });
  const session = await createSession({ userId: user.id });
  const post = (action: string, extras: Record<string, unknown> = {}) =>
    security.POST(request(session.token, action, { password, ...extras }));
  return { user, password, session, post, unit };
}
