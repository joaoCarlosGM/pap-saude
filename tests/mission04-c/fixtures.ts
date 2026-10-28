import {createVerifiedSession} from "../helpers/verified-session";
import {validateSession} from "../../src/server/auth/session.service";
import {runFirstAccessAction} from "../../src/server/auth/first-access.service";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { actor, request, origin } from "../mission04-b/fixtures";
import { POST as command } from "../../src/app/api/admin/access-invitations/route";
import { POST as consent } from "../../src/app/api/access-invitations/accept/route";
import { POST as login } from "../helpers/login-verification";
export { actor, request, origin, command, consent };
export const password = () => randomBytes(24).toString("base64url");
export async function localMessages(address: string) {
  const dir = process.env.PAP_LOCAL_MAIL_TEST_DIR!;
  assert.match(dir, /^\/tmp\/pap-m04-c-mail-/);
  const rows: { to: string; text: string; html: string; messageId?: string }[] =
    [];
  for (const name of await readdir(dir)) {
    if (name.endsWith(".json")) {
      const mail = JSON.parse(await readFile(join(dir, name), "utf8"));
      if (mail.to === address) rows.push(mail);
    }
  }
  return rows;
}
export async function invitationToken(address: string, id: string) {
  const rows = (await localMessages(address)).filter((r) =>
    r.messageId?.startsWith(`access/${id}/`),
  );
  rows.sort(
    (a, b) =>
      Number(a.messageId!.split("/").at(-1)) -
      Number(b.messageId!.split("/").at(-1)),
  );
  const link = rows.at(-1)?.html.match(/href="([^"]+)"/)?.[1];
  assert.ok(!!link, "local message contains an activation link");
  const url = new URL(link!),
    token = new URLSearchParams(url.hash.slice(1)).get("token");
  assert.ok(
    !!token && token.length === 43,
    "random token has expected entropy",
  );
  assert.equal(url.search, "");
  return token!;
}
export async function invite(
  who: Awaited<ReturnType<typeof actor>>,
  role = "COMMERCIAL",
  address = `${randomUUID()}@synthetic.invalid`,
) {
  const r = await command(
    request("/api/admin/access-invitations", who.token, {
      operation: "CREATE",
      displayName: "Pessoa convidada sintética",
      email: address,
      proposedRoleKey: role,
    }),
  );
  assert.equal(r.status, 201, "authorized invitation creation succeeds");
  const body = await r.json();
  assert.ok(
    !JSON.stringify(body).includes("token"),
    "HTTP never returns invitation secrets",
  );
  return {
    id: body.invitation.id as string,
    email: address,
    token: await invitationToken(address, body.invitation.id),
    password: password(),
  };
}
export async function accept(
  i: Awaited<ReturnType<typeof invite>>,
  sessionToken?: string,
) {
  return consent(
    request("/api/access-invitations/accept", sessionToken, {
      operation: "ACCEPT",
      token: i.token,
      password: i.password,
    }),
  );
}
export async function signIn(email: string, password: string, completeMfa = true) {
  const r = await login(
    request("/api/auth/login", undefined, { email, password }),
  );
  assert.equal(r.status, 200);
  const token = r.cookies.get("pap_session")?.value;
  assert.ok(!!token, "primary login returns its HttpOnly session cookie");
  if (!completeMfa) return token!;
  // Positive access fixtures now finish the same mandatory MFA contract.
  // Password and CAPTCHA have already been proven above; enroll/verify via real
  // services, acknowledge recovery, then complete metadata without granting IAM.
  const identity=await validateSession(token!);
  const verified=await createVerifiedSession({userId:identity.user.id});
  await runFirstAccessAction(identity.user.id,verified.session.id,"ACK_RECOVERY");
  await runFirstAccessAction(identity.user.id,verified.session.id,"COMPLETE_ONBOARDING");
  return verified.token;
}
export function decide(
  token: string,
  id: string,
  roleKey = "COMMERCIAL",
  extra: Record<string, unknown> = {},
) {
  return command(
    request("/api/admin/access-invitations", token, {
      operation: "APPROVE",
      id,
      roleKey,
      reason: "Homologação sintética autorizada",
      ...extra,
    }),
  );
}
