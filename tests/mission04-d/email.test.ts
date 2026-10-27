import assert from "node:assert/strict";
import { before, after, test, mock } from "node:test";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { transactionalTemplate } from "../../src/server/email/templates";
import { sendPlatformEmail, sendInvitationEmail } from "../../src/server/email/email.service";
import { sendPasswordResetEmail } from "../../src/server/email/password-reset-email.service";
import { mailProvider } from "../../src/server/email/email-config";
import { POST as webhook } from "../../src/app/api/email/resend/webhook/route";
import { verifyResendWebhook } from "../../src/server/email/resend-webhook.service";
import { POST as legacyInspect } from "../../src/app/api/invitations/accept/route";
import { createProfessionalInvitation } from "../../src/server/invitations/invitation.service";
import { createForgotPasswordHandler } from "../../src/server/auth/password-recovery-http";
import { authenticateLogin } from "../../src/server/auth/login.service";
import { validateSession } from "../../src/server/auth/session.service";
import { issuePasswordReset, consumePasswordReset, hashPasswordResetToken } from "../../src/server/auth/password-security.service";
import { verifyPassword } from "../../src/server/auth/password";
import { createAccessInvitation, acceptAccessInvitation, approveAccessInvitation, closeAccessInvitation, resendAccessInvitation } from "../../src/server/access-invitations/access-invitation.service";
import { mutateAdminOrganization } from "../../src/server/admin/admin-organizations.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { actor as baseActor, request } from "../mission04-b/fixtures";
async function actor(role?: Parameters<typeof baseActor>[0]) { const f = await baseActor(role); return { ...f, userId: f.user.id, sessionToken: f.token }; }
let admin: Awaited<ReturnType<typeof actor>>;
before(async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/pap_saude_m04_d_test");
  assert.match(process.env.PAP_LOCAL_MAIL_TEST_DIR!, /^\/tmp\/pap-m04-d-mail-/);
  mock.method(globalThis, "fetch", async () => { throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_TEST"); });
  await bootstrapSystemIam(); admin = await actor();
});
after(async () => { mock.restoreAll(); await db.$disconnect(); });
const address = () => `${randomUUID()}@synthetic.invalid`;
// Direct handler tests explicitly finish the response before draining after-work.
async function forgot(...args: Parameters<ReturnType<typeof createForgotPasswordHandler>>) {
  const tasks: (() => Promise<void>)[] = [];
  const response = await createForgotPasswordHandler(task => { tasks.push(task); })(...args);
  await Promise.all(tasks.map(task => task()));
  return response;
}
const keyHash = (key: string) => createHash("sha256").update(key).digest("hex");
function message() { return { to: address(), messageId: randomUUID(), subject: "Mensagem sintética PAP Saúde", text: "Texto de demonstração", html: "<p>Texto de demonstração</p>" }; }
async function messages(to: string) {
  const dir = process.env.PAP_LOCAL_MAIL_TEST_DIR!;
  const rows = [];
  for (const name of await readdir(dir)) if (name.endsWith(".json")) {
    const m = JSON.parse(await readFile(join(dir, name), "utf8")); if (m.to === to) rows.push(m);
  }
  return rows as { to: string; text: string; html: string; messageId: string }[];
}
function bearer(mail: { html: string }) {
  const url = new URL(mail.html.match(/href="([^"]+)"/)![1].replaceAll("&amp;", "&"));
  assert.equal(url.search, "");
  return new URLSearchParams(url.hash.slice(1)).get("token")!;
}
async function external<T>(fn: () => Promise<T>) {
  const saved = { ...process.env };
  Object.assign(process.env, { PAP_EMAIL_PROVIDER: "resend", PAP_EMAIL_EXTERNAL_ENABLED: "1", PAP_PUBLIC_URL: "https://mail-homolog.example.test", PAP_EMAIL_ALLOWED_HOSTS: "mail-homolog.example.test", PAP_EMAIL_FROM: "PAP Saúde <sender@example.test>", PAP_EMAIL_ALLOWED_SENDERS: "sender@example.test", RESEND_API_KEY: randomBytes(24).toString("hex"), RESEND_WEBHOOK_SECRET: `whsec_${randomBytes(32).toString("base64")}` });
  delete process.env.PAP_LOCAL_DEMO;
  delete process.env.PAP_LOCAL_DEMO_TEST;
  delete process.env.PAP_LOCAL_MAIL_TEST_DIR;
  try { return await fn(); } finally { for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
}
function signed(providerId: string, type = "email.delivered", id = randomUUID(), timestamp = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: providerId } });
  const signature = createHmac("sha256", Buffer.from(process.env.RESEND_WEBHOOK_SECRET!.slice(6), "base64")).update(`${id}.${timestamp}.${raw}`).digest("base64");
  const headers = new Headers({ "content-type": "application/json", "svix-id": id, "svix-timestamp": String(timestamp), "svix-signature": `v1,${signature}` });
  return { raw, headers };
}
const notify = (event: ReturnType<typeof signed>) => webhook(new Request("https://mail-homolog.example.test/api/email/resend/webhook", { method: "POST", headers: event.headers, body: event.raw }));

test("all five branded templates have responsive HTML, text, CTA and no external image dependency", () => {
  for (const kind of ["INVITATION", "PASSWORD_RESET", "ACCESS_APPROVED", "UBS_ACTIVATED", "ACCESS_CLOSED"] as const) {
    const m = transactionalTemplate({ kind, displayName: "Pessoa sintética", url: "https://example.test/login", roleKey: "COMMERCIAL", expiresAt: new Date("2026-10-24T12:00:00Z") });
    assert.ok(m.text.includes("PAP Saúde") && m.html.includes('lang="pt-BR"') && m.html.includes("max-width:600px") && m.html.includes('role="presentation"'));
    assert.ok(!m.html.includes("<img") && !m.html.includes("<script"));
  }
});
test("templates escape HTML/attributes, reject active URI schemes and require actual token expiration", () => {
  const m = transactionalTemplate({ kind: "INVITATION", displayName: '<img src=x onerror="attack()">', organizationName: "<script>evil</script>", url: "https://example.test/accept#token=a%22b", expiresAt: new Date("2026-10-24T12:00:00Z") });
  assert.ok(!m.html.includes("<img") && !m.html.includes("<script>") && m.html.includes("&lt;img") && m.text.includes("24/10/2026, 09:00:00"));
  assert.throws(() => transactionalTemplate({ kind: "ACCESS_APPROVED", url: "javascript:alert(1)" }));
  assert.throws(() => transactionalTemplate({ kind: "PASSWORD_RESET", url: "https://example.test" }));
});
test("local capture is private and concurrent retries create one JSON/HTML pair", async () => {
  const m = message(); const results = await Promise.all([sendPlatformEmail(m), sendPlatformEmail(m)]);
  assert.ok(results.every(r => r.status === "CAPTURED")); assert.equal((await messages(m.to)).length, 1);
  const dir = process.env.PAP_LOCAL_MAIL_TEST_DIR!;
  assert.equal((await stat(dir)).mode & 0o777, 0o700);
  for (const name of await readdir(dir)) assert.equal((await stat(join(dir, name))).mode & 0o777, 0o600);
  const row = await db.transactionalEmail.findUniqueOrThrow({ where: { keyHash: keyHash(m.messageId) } });
  assert.equal(row.attempts, 1); assert.equal(row.status, "CAPTURED");
  assert.ok(!JSON.stringify(row).includes(m.to) && !JSON.stringify(row).includes(m.html));
});
test("same idempotency identity cannot silently replace its content or transport", async () => {
  const m = message(); await sendPlatformEmail(m);
  await assert.rejects(sendPlatformEmail({ ...m, to: address() }));
  await external(async () => { await assert.rejects(sendPlatformEmail(m)); });
});
test("misconfigured local capture fails closed without network fallback or delivered status", async () => {
  const m = message(); const saved = process.env.PAP_LOCAL_DEMO;
  process.env.PAP_LOCAL_DEMO = "0";
  try { await assert.rejects(sendPlatformEmail(m)); } finally { process.env.PAP_LOCAL_DEMO = saved; }
  assert.equal((await db.transactionalEmail.findUniqueOrThrow({ where: { keyHash: keyHash(m.messageId) } })).status, "FAILED");
  assert.equal((await messages(m.to)).length, 0);
});
test("unknown provider never falls back; explicitly disabled development transport is NOT_REQUESTED", async () => {
  const saved = process.env.PAP_EMAIL_PROVIDER;
  try {
    process.env.PAP_EMAIL_PROVIDER = "typo"; await assert.rejects(sendPlatformEmail(message()));
    process.env.PAP_EMAIL_PROVIDER = "disabled"; assert.equal((await sendPlatformEmail(message())).status, "NOT_REQUESTED");
  } finally { process.env.PAP_EMAIL_PROVIDER = saved; }
});
test("real transport requires explicit opt-in, HTTPS allowlisted origin and exact sender allowlist", async () => external(async () => {
  assert.equal(mailProvider(), "RESEND");
  for (const [key, value] of [["PAP_EMAIL_EXTERNAL_ENABLED", "0"], ["PAP_PUBLIC_URL", "http://127.0.0.1:3100"], ["PAP_PUBLIC_URL", "https://127.0.0.1"], ["PAP_EMAIL_ALLOWED_HOSTS", ""], ["PAP_EMAIL_ALLOWED_SENDERS", "other@example.test"], ["PAP_EMAIL_FROM", "sender@example.test\r\nBcc: attacker@example.test"], ["PAP_PUBLIC_URL", "https://user:pass@mail-homolog.example.test"]]) {
    const saved = process.env[key]; process.env[key] = value;
    try { assert.throws(() => mailProvider()); } finally { process.env[key] = saved; }
  }
}));
test("Resend rejects local-demo flags and operator database name even with a valid public HTTPS configuration", async () => external(async () => {
  for (const [key, value] of [
    ["PAP_LOCAL_DEMO", "1"], ["PAP_LOCAL_DEMO_TEST", "1"],
    ["PAP_LOCAL_MAIL_TEST_DIR", "/tmp/pap-m04-d-mail-synthetic"],
    // Configuration parsing only. No connection, credentials or lab resource access.
    ["DATABASE_URL", "postgresql://127.0.0.1:15432/pap_admin_beta1_local?schema=public"],
  ]) {
    const saved = process.env[key]; process.env[key] = value;
    try { assert.throws(() => mailProvider()); }
    finally { if (saved === undefined) delete process.env[key]; else process.env[key] = saved; }
  }
}));
test("recovery sends the public response before any account lookup, throttle or blocked provider work", { timeout: 5000 }, async () => {
  const tasks: (() => Promise<void>)[] = [];
  let calls = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const handler = createForgotPasswordHandler(task => { tasks.push(task); }, async () => {
    calls++;
    await gate; // A provider/DB that never resolves cannot delay the HTTP response.
  });
  for (const email of [admin.user.email, address(), "inactive@synthetic.invalid", "throttled@synthetic.invalid"]) {
    const response = await handler(request("/api/auth/password/forgot", undefined, { email }));
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { accepted: true });
    assert.match(response.headers.get("Cache-Control")!, /no-store/);
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(calls, 0); // Proves ordering, without an unreliable timing threshold.
  }
  const pending = tasks.map(task => task());
  assert.equal(calls, 4);
  release(); await Promise.all(pending);
});
test("post-response recovery failure logs only a fixed code, never request data or exception secrets", async t => {
  const tasks: (() => Promise<void>)[] = [];
  const logs: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logs.push(args); });
  const handler = createForgotPasswordHandler(task => { tasks.push(task); }, async () => {
    throw new Error(`private-bearer-${randomBytes(32).toString("hex")}`);
  });
  const response = await handler(request("/api/auth/password/forgot", undefined, { email: address() }));
  assert.equal(response.status, 202); assert.deepEqual(await response.json(), { accepted: true });
  await Promise.all(tasks.map(task => task()));
  assert.deepEqual(logs, [["PASSWORD_RESET_BACKGROUND_FAILED"]]);
});
test("production disallows disabled/local capture and never returns an invitation bearer", async t => external(async () => {
  const saved = process.env.NODE_ENV; Object.assign(process.env, { NODE_ENV: "production" });
  try {
    let outgoing = "";
    t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
      outgoing = String(options.body); return Response.json({ id: randomUUID() });
    });
    const created = await createProfessionalInvitation({ invitedByUserId: admin.user.id,
    actorSessionToken: admin.token,
      email: address(), displayName: "Pessoa sintética produção", organizationId: admin.unit.id });
    assert.equal(created.developmentUrl, undefined);
    const payload = JSON.parse(outgoing), token = bearer(payload);
    assert.ok(token && !JSON.stringify(created).includes(token));
    assert.ok(!outgoing.includes("?token=") && outgoing.includes("#token="));
    process.env.PAP_EMAIL_PROVIDER = "disabled"; assert.throws(() => mailProvider());
    process.env.PAP_EMAIL_PROVIDER = "local-demo";
    await assert.rejects(sendPlatformEmail(message()));
  } finally { Object.assign(process.env, { NODE_ENV: saved }); }
}));
test("mock provider acceptance is not delivery; concurrent requests use one stable idempotency key", async t => external(async () => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => { calls++; assert.ok(new Headers(options.headers).get("Idempotency-Key")?.startsWith("pap-mail/")); return Response.json({ id: randomUUID() }); });
  const m = message(); const r = await Promise.all([sendPlatformEmail(m), sendPlatformEmail(m)]);
  assert.equal(calls, 1); assert.ok(r.every(x => x.mode === "RESEND" && x.status === "ACCEPTED_BY_PROVIDER"));
}));
test("mock provider errors never become successful capture and retries remain bounded to provider deduplication window", async t => external(async () => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ error: "synthetic failure" }, { status: 429 }); });
  const m = message(); await assert.rejects(sendPlatformEmail(m)); await assert.rejects(sendPlatformEmail(m)); assert.equal(calls, 2);
  await db.transactionalEmail.update({ where: { keyHash: keyHash(m.messageId) }, data: { createdAt: new Date(Date.now() - 24 * 3600_000) } });
  await assert.rejects(sendPlatformEmail(m)); assert.equal(calls, 2);
  assert.equal((await db.transactionalEmail.findUniqueOrThrow({ where: { keyHash: keyHash(m.messageId) } })).status, "FAILED");
}));
test("webhook signatures protect raw bytes, timestamp and secret before parsing", async () => external(async () => {
  const event = signed(randomUUID()); assert.equal(typeof verifyResendWebhook(event.raw, event.headers), "string");
  assert.throws(() => verifyResendWebhook(event.raw + " ", event.headers));
  assert.throws(() => verifyResendWebhook(event.raw, signed(randomUUID(), "email.delivered", randomUUID(), Math.floor(Date.now()/1000)-301).headers));
  event.headers.set("svix-signature", "v1,invalid"); assert.equal((await notify(event)).status, 400);
}));
test("webhook endpoint rejects oversized bodies and is disabled in local-demo", async () => {
  const response = await webhook(new Request("http://127.0.0.1:3110/api/email/resend/webhook", { method: "POST", headers: {"content-type":"application/json"}, body: "x".repeat(65537) }));
  assert.equal(response.status, 400);
  assert.equal((await webhook(new Request("http://127.0.0.1:3110/api/email/resend/webhook", { method: "POST", headers: {"content-type":"application/json"}, body: "{}" }))).status, 400);
});
test("authenticated delivery/bounce events deduplicate concurrently; stale delivery cannot reverse a bounce", async t => external(async () => {
  const providerId = randomUUID(); t.mock.method(globalThis, "fetch", async () => Response.json({ id: providerId }));
  const m = message(); await sendPlatformEmail(m);
  const event = signed(providerId); const responses = await Promise.all([notify(event), notify(event)]);
  assert.ok(responses.every(r => r.status === 200));
  let row = await db.transactionalEmail.findUniqueOrThrow({ where: { providerMessageId: providerId } }); assert.equal(row.status, "DELIVERED");
  assert.equal(await db.transactionalEmailEvent.count({ where: { emailId: row.id } }), 1);
  assert.equal((await notify(signed(providerId, "email.bounced"))).status, 200);
  await notify(signed(providerId)); row = await db.transactionalEmail.findUniqueOrThrow({ where: { providerMessageId: providerId } }); assert.equal(row.status, "BOUNCED");
  await notify(signed(providerId, "email.complained")); assert.equal((await db.transactionalEmail.findUniqueOrThrow({ where: { id: row.id } })).status, "COMPLAINED");
}));
test("unknown provider message gets retry response; signed unsupported events are ignored", async () => external(async () => {
  assert.equal((await notify(signed(randomUUID()))).status, 503);
  assert.equal((await notify(signed(randomUUID(), "email.opened"))).status, 200);
}));
test("authenticated failure remains FAILED across delayed delivery, duplicate webhook and explicit retry", async t => external(async () => {
  const providerId = randomUUID(); let sends = 0;
  t.mock.method(globalThis, "fetch", async () => { sends++; return Response.json({ id: providerId }); });
  const m = message(); assert.equal((await sendPlatformEmail(m)).status, "ACCEPTED_BY_PROVIDER");
  const failed = signed(providerId, "email.failed");
  assert.equal((await notify(failed)).status, 200);
  assert.equal((await notify(failed)).status, 200);
  assert.equal((await notify(signed(providerId))).status, 200);
  const row = await db.transactionalEmail.findUniqueOrThrow({ where: { providerMessageId: providerId } });
  assert.equal(row.status, "FAILED");
  assert.equal(await db.transactionalEmailEvent.count({ where: { emailId: row.id, kind: "FAILED" } }), 1);
  assert.equal((await sendPlatformEmail(m)).status, "FAILED");
  assert.equal(sends, 1); // A retry cannot resend or turn terminal failure into success.
}));
test("global invitation renders accepted role/name/actual expiry and still grants nothing on acceptance", async () => {
  const to = address(); const i = (await createAccessInvitation(admin, { email: to, displayName: "Pessoa sintética D", proposedRoleKey: "COMMERCIAL" })).invitation;
  const mail = (await messages(to))[0]; assert.ok(mail.text.includes("Comercial") && mail.text.includes("Pessoa sintética D"));
  const token = bearer(mail); const row = await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } });
  assert.ok(!JSON.stringify(row).includes(token));
  await acceptAccessInvitation({ token, password: randomBytes(24).toString("base64url") });
  const accepted = await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } });
  assert.equal(await db.roleAssignment.count({ where: { userId: accepted.userId! } }), 0);
  await assert.rejects(acceptAccessInvitation({ token, password: randomBytes(24).toString("base64url") }));
  await approveAccessInvitation(admin, i.id, { roleKey: "COMMERCIAL", reason: "Teste sintético" });
  assert.equal(await db.userNotification.count({ where: { invitationId: i.id, kind: "ACCESS_APPROVED" } }), 1);
  assert.equal((await messages(to)).length, 2);
  await approveAccessInvitation(admin, i.id, { roleKey: "COMMERCIAL", reason: "Teste sintético" }); assert.equal((await messages(to)).length, 2);
  await closeAccessInvitation(admin, i.id, "REVOKE", "Teste sintético");
  await closeAccessInvitation(admin, i.id, "REVOKE", "Teste sintético");
  assert.equal((await messages(to)).length, 3); assert.equal(await db.roleAssignment.count({ where: { userId: accepted.userId! } }), 0);
});
test("rejection template is sent only to an accepted identity and explicit replay deduplicates", async () => {
  const to = address(); const i = (await createAccessInvitation(admin, { email: to, displayName: "Pessoa D", proposedRoleKey: "COMMERCIAL" })).invitation;
  await acceptAccessInvitation({ token: bearer((await messages(to))[0]), password: randomBytes(24).toString("base64url") });
  await closeAccessInvitation(admin, i.id, "REJECT", "Decisão sintética privada"); await closeAccessInvitation(admin, i.id, "REJECT", "Decisão sintética privada");
  const rows = await messages(to); assert.equal(rows.length, 2); assert.ok(!rows[1].text.includes("Decisão sintética privada"));
});
test("external global invitation status reflects mock acceptance and stale webhook cannot mark a replacement token delivered", async t => external(async () => {
  const ids: string[] = []; t.mock.method(globalThis, "fetch", async () => { const id = randomUUID(); ids.push(id); return Response.json({ id }); });
  const i = (await createAccessInvitation(admin, { email: address(), displayName: "Pessoa D", proposedRoleKey: "COMMERCIAL" })).invitation;
  assert.equal(i.deliveryStatus, "ACCEPTED_BY_PROVIDER");
  await resendAccessInvitation(admin, i.id); await notify(signed(ids[0]));
  assert.equal((await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } })).deliveryStatus, "ACCEPTED_BY_PROVIDER");
  await notify(signed(ids[1])); assert.equal((await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } })).deliveryStatus, "DELIVERED");
}));
test("institutional invitations use shared template and provider without changing scoped IAM", async () => {
  const to = address(); const token = randomBytes(32).toString("base64url");
  const result = await sendInvitationEmail({ to, displayName: "Contato D", organizationName: "UBS sintética", invitationUrl: `http://127.0.0.1:3110/convite?token=${token}`, invitationId: randomUUID(), roleKey: "PROFESSIONAL", expiresAt: new Date(Date.now()+3600_000) });
  assert.equal(result.status, "CAPTURED"); assert.ok((await messages(to))[0].text.includes("Profissional"));
  assert.ok(bearer((await messages(to))[0]) === token);
});
test("forgot-password responses are indistinguishable; actual local link is hashed, one-time and preserves MFA", async () => {
  const f = await actor();
  const before = JSON.stringify(await db.mfaFactor.findMany({ where: { userId: f.user.id } }));
  const a = await forgot(request("/api/auth/password/forgot", undefined, { email: f.user.email }));
  const b = await forgot(request("/api/auth/password/forgot", undefined, { email: address() }));
  assert.equal(a.status, 202); assert.equal(b.status, 202); assert.deepEqual(await a.json(), await b.json());
  const token = bearer((await messages(f.user.email))[0]); const saved = await db.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashPasswordResetToken(token) } });
  assert.ok(!JSON.stringify(saved).includes(token));
  assert.ok(saved.expiresAt.getTime()-saved.createdAt.getTime() === 30*60_000);
  const password = randomBytes(24).toString("base64url"); await consumePasswordReset({ token, newPassword: password });
  await assert.rejects(consumePasswordReset({ token, newPassword: password }));
  assert.ok(await verifyPassword((await db.passwordCredential.findUniqueOrThrow({ where: { userId: f.user.id } })).passwordHash, password));
  assert.equal(await db.session.count({ where: { userId: f.user.id, revokedAt: null } }), 0);
  await assert.rejects(validateSession(f.token));
  assert.equal((await authenticateLogin({ email: f.user.email, password, origin: "d-after-reset" })).status, "MFA_REQUIRED");
  assert.ok(before === JSON.stringify(await db.mfaFactor.findMany({ where: { userId: f.user.id } })));
});
test("expired/revoked reset tokens fail; mail failure revokes token without changing password/MFA", async () => {
  const f = await actor(); const old = (await db.passwordCredential.findUniqueOrThrow({ where: { userId: f.user.id } })).passwordHash;
  let token = "";
  await issuePasswordReset({ email: f.user.email, origin: randomUUID(), now: new Date(Date.now()-31*60_000), deliver: async (_email, t) => { token = t; } });
  await assert.rejects(consumePasswordReset({ token, newPassword: randomBytes(24).toString("base64url") }));
  await issuePasswordReset({ email: f.user.email, origin: randomUUID(), deliver: async () => { throw new Error("synthetic mail failure"); } });
  assert.equal(await db.passwordResetToken.count({ where: { userId: f.user.id, revokedAt: { not: null } } }), 1);
  assert.ok(old === (await db.passwordCredential.findUniqueOrThrow({ where: { userId: f.user.id } })).passwordHash);
});
test("concurrent reset requests enforce shared quota, including unknown identities, without enumeration", async () => {
  const f = await actor(); let deliveries = 0;
  await Promise.all(Array.from({length: 7}, () => issuePasswordReset({ email: f.user.email, origin: randomUUID(), deliver: async () => { deliveries++; } })));
  assert.equal(deliveries, 3);
  const origin = randomUUID();
  for (let i=0; i<20; i++) await issuePasswordReset({ email: address(), origin, deliver: sendPasswordResetEmail });
  const fresh = await actor();
  await issuePasswordReset({ email: fresh.user.email, origin, deliver: async () => { deliveries++; } }); assert.equal(deliveries, 3);
  await issuePasswordReset({ email: fresh.user.email, origin: randomUUID(), deliver: async () => { deliveries++; } }); assert.equal(deliveries, 4);
});
test("UBS activation receipts require real active unit-admin membership and never notify arbitrary public contacts", async () => {
  const unit = admin.unit;
  const responsible = await db.user.create({ data: { email: address(), displayName: "Responsável sintético" } });
  const outsider = await db.user.create({ data: { email: address(), displayName: "Sem vínculo" } });
  await db.membership.create({ data: { userId: responsible.id, organizationId: unit.id, status: "ACTIVE" } });
  await assignSystemRole({ userId: responsible.id, roleKey: "HEALTH_UNIT_ADMIN", organizationId: unit.id });
  await db.organization.update({ where: { id: unit.id }, data: { status: "PENDING_VERIFICATION", isActive: false } });
  await mutateAdminOrganization(admin.user.id, unit.id, { operation: "ACTIVATE" }, admin.token);
  const rows = await messages(responsible.email); assert.equal(rows.length, 1); assert.ok(rows[0].text.includes("Ativação institucional"));
  assert.equal((await messages(outsider.email)).length, 0);
  await mutateAdminOrganization(admin.user.id, unit.id, { operation: "ACTIVATE" }, admin.token); assert.equal((await messages(responsible.email)).length, 1);
  const manager = await actor("PAP_MANAGER"); await assert.rejects(mutateAdminOrganization(manager.user.id, unit.id, { operation: "ACTIVATE" }, manager.token));
  assert.equal(await db.organizationActivationNotice.count({ where: { organizationId: unit.id } }), 1);
});
test("email ledger and delivery audit never contain bodies, addresses, tokens or provider credentials", async () => {
  const m = message(); const secret = randomBytes(32).toString("base64url"); m.text += secret; m.html += secret;
  await sendPlatformEmail(m);
  const row = await db.transactionalEmail.findUniqueOrThrow({ where: { keyHash: keyHash(m.messageId) } });
  const audit = await db.auditEvent.findMany({ where: { resourceId: row.id } });
  assert.ok(!JSON.stringify([row, audit]).includes(secret) && !JSON.stringify([row, audit]).includes(m.to));
});

test("forgot password still requires trusted CSRF origin and cannot leak an account through transport errors", async () => {
  const f = await actor();
  const response = await forgot(request("/api/auth/password/forgot", undefined, { email: f.user.email }, "POST", { origin: "https://attacker.invalid" }));
  assert.equal(response.status, 403);
  assert.equal((await messages(f.user.email)).length, 0);
});
test("institutional bearer inspection accepts POST without query, never grants access, and preserves old token validity", async () => {
  const created = await createProfessionalInvitation({ invitedByUserId: admin.user.id,
    actorSessionToken: admin.token,
    email: address(), displayName: "Pessoa D", organizationId: admin.unit.id });
  assert.ok((await db.userInvitation.findUniqueOrThrow({ where: { id: created.invitation.id } })).deliveryAttemptedAt);
  const token = bearer((await messages(created.invitation.email))[0]);
  const before = await db.roleAssignment.count();
  const response = await legacyInspect(request("/api/invitations/accept", undefined, { operation: "INSPECT", token }));
  assert.equal(response.status, 200); assert.ok(!JSON.stringify(await response.json()).includes(token));
  assert.equal(await db.roleAssignment.count(), before);
  const wrong = await legacyInspect(request("/api/invitations/accept", undefined, { operation: "OTHER", token })); assert.equal(wrong.status, 400);
});
test("concurrent reset consumption changes credentials and creates the success audit exactly once", async () => {
  const f = await actor(); let token = "";
  await issuePasswordReset({ email: f.user.email, origin: randomUUID(), deliver: async (_email, value) => { token = value; } });
  const newPassword = randomBytes(24).toString("base64url");
  const results = await Promise.allSettled([consumePasswordReset({ token, newPassword }), consumePasswordReset({ token, newPassword })]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(await db.auditEvent.count({ where: { action: "PASSWORD_RESET", resourceId: f.user.id } }), 1);
});

test("local-demo repairs an interrupted pair but rejects an existing mismatched file or symlink", async () => {
  const { captureLocalDemoMail } = await import("../../src/server/email/local-demo-mail");
  const { unlink, writeFile, symlink } = await import("node:fs/promises");
  const m = { ...message(), eventTime: new Date().toISOString() };
  await captureLocalDemoMail(m);
  const base = join(process.env.PAP_LOCAL_MAIL_TEST_DIR!, `${Date.parse(m.eventTime)}-${keyHash(m.messageId)}`);
  await unlink(base + ".html"); await captureLocalDemoMail(m);
  assert.equal(await readFile(base + ".html", "utf8"), m.html);
  await writeFile(base + ".html", "conflict"); await assert.rejects(captureLocalDemoMail(m));
  await unlink(base + ".html");
  const target = base + ".target"; await writeFile(target, "private fixture", { mode: 0o600 });
  await symlink(target, base + ".html"); await assert.rejects(captureLocalDemoMail(m));
  assert.equal(await readFile(target, "utf8"), "private fixture");
});
