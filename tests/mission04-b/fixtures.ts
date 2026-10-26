import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { verifiedLoginFixture } from "../first-access/login-fixtures";
import { db } from "../../src/server/db/client";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
export const origin = "http://127.0.0.1:3110";
export async function actor(
  role: "PAP_ADMIN" | "PAP_MANAGER" | "COMMERCIAL" = "PAP_ADMIN",
) {
  const f = await verifiedLoginFixture();
  if (role !== "PAP_ADMIN") {
    await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
    await assignSystemRole({ userId: f.user.id, roleKey: role });
  }
  return { ...f, token: f.verified.sessionToken };
}
export function request(
  path: string,
  token?: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  extraHeaders: Record<string, string> = {},
) {
  return new NextRequest(origin + path, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      ...(token ? { cookie: `pap_session=${token}` } : {}),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
export function publicBody() {
  return {
    name: `UBS demonstração ${randomUUID()}`,
    city: "Belém",
    state: "PA",
    address: "Rua sintética 100",
    contactName: "Contato sintético",
    contactEmail: `${randomUUID()}@synthetic.invalid`,
    contactPhone: "91999990000",
    consent: true,
  };
}
