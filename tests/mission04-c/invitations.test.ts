import assert from "node:assert/strict";
import { after, before, test, mock } from "node:test";
import pg from "pg";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { getEffectiveAccessProfile } from "../../src/server/iam/effective-access-profile.service";
import { resolveLoginNavigation } from "../../src/server/auth/login-navigation.service";
import { navigationFingerprint } from "../first-access/login-fixtures";
import {
  validateSession,
  revokeSessionByToken,
} from "../../src/server/auth/session.service";
import { hashPassword } from "../../src/server/auth/password";
import { createProfessionalInvitation } from "../../src/server/invitations/invitation.service";
import { GET as queue } from "../../src/app/api/admin/access-invitations/route";
import { GET as ownStatus } from "../../src/app/api/account/access-status/route";
import {
  GET as notifications,
  PATCH as markRead,
} from "../../src/app/api/account/notifications/route";
import { POST as oldAssign } from "../../src/app/api/admin/role-assignments/route";
import { POST as oldAccept } from "../../src/app/api/invitations/accept/route";
import { DELETE as oldRevoke } from "../../src/app/api/admin/role-assignments/[assignmentId]/route";
import { GET as clinical } from "../../src/app/api/clinical/[[...path]]/route";
import { GET as organizations } from "../../src/app/api/admin/organizations/route";
import {
  actor,
  request,
  command,
  consent,
  invite,
  accept,
  signIn,
  decide,
  password,
  localMessages,
  invitationToken,
} from "./fixtures";
let admin: Awaited<ReturnType<typeof actor>>,
  manager: Awaited<ReturnType<typeof actor>>,
  otherManager: Awaited<ReturnType<typeof actor>>,
  commercial: Awaited<ReturnType<typeof actor>>;
before(async () => {
  assert.equal(
    new URL(process.env.DATABASE_URL!).pathname,
    "/pap_saude_m04_c_test",
  );
  await bootstrapSystemIam();
  admin = await actor();
  manager = await actor("PAP_MANAGER");
  otherManager = await actor("PAP_MANAGER");
  commercial = await actor("COMMERCIAL");
});
after(() => db.$disconnect());
const close = (token: string, id: string, operation = "REVOKE") =>
  command(
    request("/api/admin/access-invitations", token, {
      operation,
      id,
      reason: "Decisão sintética de homologação",
    }),
  );

// Hold the real abuse-bucket row: the HTTP MFA guard must already have passed,
// while the domain transaction has not started. Revoke through another real
// connection, then release the request. No Prisma mock or production test hook.
async function revokeBetweenGuardAndTransaction(
  f: Awaited<ReturnType<typeof actor>>,
  id: string,
  revoke: () => Promise<unknown>,
) {
  const window = Math.floor(Date.now() / 3_600_000);
  const key = createHash("sha256")
    .update(`beta:v1:access-invitations/APPROVE:${window}:${f.user.id}`)
    .digest("hex");
  await db.betaAbuseBucket.create({
    data: { key, count: 0, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  const lock = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await lock.connect();
  let pending: ReturnType<typeof decide> | undefined,
    committed = false;
  try {
    await lock.query("BEGIN");
    await lock.query(
      "SELECT key FROM beta_abuse_buckets WHERE key=$1 FOR UPDATE",
      [key],
    );
    pending = decide(f.token, id);
    let waiting = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      await lock.query("SELECT pg_stat_clear_snapshot()");
      waiting =
        Number(
          (
            await lock.query(
              "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%beta_abuse_buckets%'",
            )
          ).rows[0].count,
        ) > 0;
      if (waiting) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.ok(
      waiting,
      "request is blocked after the HTTP guard and before the domain transaction",
    );
    await revoke();
    await lock.query("COMMIT");
    committed = true;
    return await pending;
  } finally {
    if (!committed) await lock.query("ROLLBACK");
    await pending;
    await lock.end();
  }
}

test("global invite has no UBS requirement, stores only domain-separated hash and does not create identity or grant", async () => {
  const i = await invite(manager);
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.ok(row.tokenHash !== i.token && /^[0-9a-f]{64}$/.test(row.tokenHash!));
  assert.equal(row.userId, null);
  assert.equal(row.status, "PENDING_ACCEPTANCE");
  assert.equal(await db.user.count({ where: { email: i.email } }), 0);
  assert.equal(row.deliveryStatus, "CAPTURED");
  const mail = await localMessages(i.email);
  assert.equal(mail.length, 1);
  assert.ok(mail[0].text.includes("não libera acesso operacional"));
});

test("acceptance creates password identity but no membership or role; login goes to real waiting state", async () => {
  const i = await invite(manager);
  assert.equal((await accept(i)).status, 200);
  const u = await db.user.findUniqueOrThrow({ where: { email: i.email } });
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.equal(row.status, "PENDING_ASSIGNMENT");
  assert.equal(row.tokenHash, null);
  assert.equal(await db.roleAssignment.count({ where: { userId: u.id } }), 0);
  assert.equal(await db.membership.count({ where: { userId: u.id } }), 0);
  const token = await signIn(i.email, i.password);
  assert.deepEqual(await resolveLoginNavigation(token), {
    view: "REDIRECT",
    destination: "/aguardando-autorizacao",
  });
  const response = await ownStatus(
    request("/api/account/access-status", token),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.access.status, "PENDING_ASSIGNMENT");
  assert.equal(data.access.canContinue, false);
  assert.deepEqual(Object.keys(data.access).sort(), [
    "acceptedAt",
    "canContinue",
    "decidedAt",
    "status",
    "user",
  ]);
  assert.deepEqual(Object.keys(data.access.user).sort(), [
    "displayName",
    "email",
  ]);
});

test("manager authorizes only Commercial; notification and release capture are persistent and idempotent", async () => {
  const i = await invite(manager);
  assert.equal((await accept(i)).status, 200);
  const token = await signIn(i.email, i.password);
  assert.equal((await decide(manager.token, i.id)).status, 200);
  assert.equal((await decide(manager.token, i.id)).status, 200);
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.equal(row.status, "ACTIVE");
  assert.ok(!!row.assignmentId);
  assert.equal(
    await db.roleAssignment.count({ where: { userId: row.userId! } }),
    1,
  );
  assert.equal(
    await db.userNotification.count({
      where: { userId: row.userId!, kind: "ACCESS_APPROVED" },
    }),
    1,
  );
  const notice = await db.userNotification.findFirstOrThrow({
    where: { invitationId: i.id, kind: "ACCESS_APPROVED" },
  });
  assert.equal(notice.emailStatus, "CAPTURED");
  assert.equal((await localMessages(i.email)).length, 2);
  const feed = await (
    await notifications(request("/api/account/notifications", token))
  ).json();
  assert.equal(feed.notifications.length, 1);
  assert.equal(feed.notifications[0].title, "Seu acesso foi liberado");
  assert.deepEqual(await resolveLoginNavigation(token), {
    view: "REDIRECT",
    destination: "/comercial",
  });
  assert.equal(
    (await organizations(request("/api/admin/organizations", token))).status,
    403,
  );
  const denied = await clinical(
    request("/api/clinical/patients", token, undefined, "GET", {
      "x-organization-id": manager.unit.id,
    }),
    { params: Promise.resolve({ path: ["patients"] }) },
  );
  assert.equal(denied.status, 403);
});

test("Admin can appoint Manager; an existing MFA account, password, valid session and completed onboarding remain intact", async () => {
  const recipient = await actor();
  await db.roleAssignment.deleteMany({ where: { userId: recipient.user.id } });
  const before = await navigationFingerprint(recipient.user.id);
  const i = await invite(admin, "PAP_MANAGER", recipient.user.email);
  i.password = recipient.password;
  assert.equal((await accept(i, recipient.token)).status, 200);
  assert.ok(
    before === (await navigationFingerprint(recipient.user.id)),
    "acceptance preserves identity/password/MFA/session/onboarding",
  );
  assert.equal((await decide(admin.token, i.id, "PAP_MANAGER")).status, 200);
  assert.deepEqual(await resolveLoginNavigation(recipient.token), {
    view: "REDIRECT",
    destination: "/admin",
  });
  const after = JSON.parse(await navigationFingerprint(recipient.user.id));
  const previous = JSON.parse(before);
  after[6] = [];
  previous[6] = [];
  assert.ok(
    JSON.stringify(after) === JSON.stringify(previous),
    "authorization changes only IAM, not account security or onboarding",
  );
});

test("new Manager cannot enter admin before real MFA setup/login and receives no clinical permission", async () => {
  const i = await invite(admin, "PAP_MANAGER");
  await accept(i);
  const token = await signIn(i.email, i.password, false);
  assert.equal((await decide(admin.token, i.id, "PAP_MANAGER")).status, 200);
  assert.deepEqual(await resolveLoginNavigation(token), {
    view: "REDIRECT",
    destination: "/primeiros-passos",
  });
  assert.equal(
    (await queue(request("/api/admin/access-invitations", token))).status,
    403,
  );
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.ok(
    !(await getEffectiveAccessProfile(row.userId!))!.permissions.includes(
      "patient.read",
    ),
  );
});

test("primary Admin/Manager sessions cannot inherit MFA from a verified sibling session", async () => {
  for (const f of [admin, manager]) {
    assert.equal(
      (await queue(request("/api/admin/access-invitations", f.session.token)))
        .status,
      403,
    );
    for (const operation of [
      "RESEND",
      "APPROVE",
      "REJECT",
      "REVOKE",
      "RETRY_NOTICE",
    ]) {
      assert.equal(
        (
          await command(
            request("/api/admin/access-invitations", f.session.token, {
              operation,
              id: randomUUID(),
              roleKey: "COMMERCIAL",
              reason: "Teste de MFA",
            }),
          )
        ).status,
        403,
      );
    }
    assert.equal(
      (
        await command(
          request("/api/admin/access-invitations", f.session.token, {
            operation: "CREATE",
            email: `${randomUUID()}@synthetic.invalid`,
            displayName: "Teste",
            proposedRoleKey: "COMMERCIAL",
          }),
        )
      ).status,
      403,
    );
  }
});

test("anonymous, Commercial and primary actors cannot read or write the privileged queue; CSRF and injected fields are rejected", async () => {
  assert.equal(
    (await queue(request("/api/admin/access-invitations"))).status,
    401,
  );
  assert.equal(
    (await queue(request("/api/admin/access-invitations", commercial.token)))
      .status,
    403,
  );
  assert.equal(
    (
      await command(
        request("/api/admin/access-invitations", commercial.token, {
          operation: "CREATE",
          email: `${randomUUID()}@synthetic.invalid`,
          displayName: "Teste",
          proposedRoleKey: "COMMERCIAL",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await command(
        request(
          "/api/admin/access-invitations",
          manager.token,
          { operation: "REVOKE", id: randomUUID(), reason: "Teste" },
          "POST",
          { origin: "https://attacker.invalid" },
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await command(
        request("/api/admin/access-invitations", manager.token, {
          operation: "CREATE",
          email: `${randomUUID()}@synthetic.invalid`,
          displayName: "Teste",
          proposedRoleKey: "COMMERCIAL",
          actorUserId: admin.user.id,
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await queue(
        request(
          "/api/admin/access-invitations?userId=" + admin.user.id,
          manager.token,
        ),
      )
    ).status,
    400,
  );
});

test("manager cannot propose Manager/Admin, authorize a scoped role, modify another manager's invite, or target privileged identities", async () => {
  for (const role of ["PAP_MANAGER", "PAP_ADMIN"]) {
    const r = await command(
      request("/api/admin/access-invitations", manager.token, {
        operation: "CREATE",
        email: `${randomUUID()}@synthetic.invalid`,
        displayName: "Teste",
        proposedRoleKey: role,
      }),
    );
    assert.ok([400, 403].includes(r.status));
  }
  const i = await invite(otherManager);
  await accept(i);
  assert.equal((await decide(manager.token, i.id)).status, 404);
  assert.equal((await close(manager.token, i.id)).status, 404);
  const own = await invite(manager);
  await accept(own);
  assert.equal(
    (
      await decide(manager.token, own.id, "PROFESSIONAL", {
        organizationId: manager.unit.id,
      })
    ).status,
    403,
  );
  const self = await command(
    request("/api/admin/access-invitations", manager.token, {
      operation: "CREATE",
      email: manager.user.email,
      displayName: "Teste",
      proposedRoleKey: "COMMERCIAL",
    }),
  );
  assert.equal(self.status, 409);
  const privileged = await command(
    request("/api/admin/access-invitations", manager.token, {
      operation: "CREATE",
      email: admin.user.email,
      displayName: "Teste",
      proposedRoleKey: "COMMERCIAL",
    }),
  );
  assert.equal(privileged.status, 409);
});

test("pending C identity cannot bypass authorization through old role APIs or institutional invitations", async () => {
  const address = `${randomUUID()}@synthetic.invalid`;
  const legacy = await createProfessionalInvitation({
    invitedByUserId: admin.user.id,
    actorSessionToken: admin.token,
    organizationId: admin.unit.id,
    email: address,
    displayName: "Pessoa sintética",
  });
  const i = await invite(manager, "COMMERCIAL", address);
  await accept(i);
  const legacyUrl = new URL(legacy.developmentUrl!);
  const oldToken =
    legacyUrl.searchParams.get("token") ??
    new URLSearchParams(legacyUrl.hash.slice(1)).get("token");
  assert.ok(oldToken);
  assert.equal(
    (
      await oldAccept(
        request("/api/invitations/accept", undefined, {
          token: oldToken,
          password: i.password,
        }),
      )
    ).status,
    410,
  );
  assert.equal(
    (
      await oldAccept(
        request("/api/invitations/accept", undefined, {
          token: i.token,
          password: i.password,
        }),
      )
    ).status,
    410,
  );
  const user = await db.user.findUniqueOrThrow({ where: { email: i.email } });
  const r = await oldAssign(
    request("/api/admin/role-assignments", admin.token, {
      userId: user.id,
      roleKey: "COMMERCIAL",
      organizationId: null,
    }),
  );
  assert.equal(r.status, 409);
  await assert.rejects(
    createProfessionalInvitation({
      invitedByUserId: admin.user.id,
    actorSessionToken: admin.token,
      organizationId: admin.unit.id,
      email: i.email,
      displayName: "Pessoa sintética",
    }),
  );
  assert.equal(
    await db.roleAssignment.count({ where: { userId: user.id } }),
    0,
  );
});

test("reusing, revoking or expiring a link never creates identity or grants; resend invalidates the previous token", async () => {
  const i = await invite(manager);
  assert.equal(
    (
      await command(
        request("/api/admin/access-invitations", manager.token, {
          operation: "RESEND",
          id: i.id,
        }),
      )
    ).status,
    200,
  );
  const fresh = await invitationToken(i.email, i.id);
  assert.ok(fresh !== i.token);
  assert.equal((await accept(i)).status, 400);
  i.token = fresh;
  assert.equal((await accept(i)).status, 200);
  assert.equal((await accept(i)).status, 400);
  assert.equal(
    (
      await command(
        request("/api/admin/access-invitations", manager.token, {
          operation: "RESEND",
          id: i.id,
        }),
      )
    ).status,
    409,
  );
  const revoked = await invite(manager);
  assert.equal((await close(manager.token, revoked.id)).status, 200);
  assert.equal((await accept(revoked)).status, 400);
  assert.equal(await db.user.count({ where: { email: revoked.email } }), 0);
  const expired = await invite(manager);
  await db.accessInvitation.update({
    where: { id: expired.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await accept(expired)).status, 400);
  const filtered = await (
    await queue(
      request("/api/admin/access-invitations?status=EXPIRED", manager.token),
    )
  ).json();
  assert.ok(
    filtered.rows.some(
      (r: { id: string; status: string }) =>
        r.id === expired.id && r.status === "EXPIRED",
    ),
  );
  assert.equal(
    (
      await command(
        request("/api/admin/access-invitations", manager.token, {
          operation: "RESEND",
          id: expired.id,
        }),
      )
    ).status,
    200,
  );
  assert.equal((await accept(expired)).status, 400);
});

test("duplicate concurrent creation captures one invitation and no premature user", async () => {
  const address = `${randomUUID()}@synthetic.invalid`;
  const body = {
    operation: "CREATE",
    email: address,
    displayName: "Pessoa sintética",
    proposedRoleKey: "COMMERCIAL",
  };
  const responses = await Promise.all([
    command(request("/api/admin/access-invitations", manager.token, body)),
    command(request("/api/admin/access-invitations", manager.token, body)),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    await db.accessInvitation.count({
      where: { email: address, activeSlot: 1 },
    }),
    1,
  );
  assert.equal(await db.user.count({ where: { email: address } }), 0);
  assert.equal((await localMessages(address)).length, 1);
});

test("concurrent acceptance consumes the token once without password/session/role duplication", async () => {
  const i = await invite(manager);
  const responses = await Promise.all([accept(i), accept(i)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
  const u = await db.user.findUniqueOrThrow({ where: { email: i.email } });
  assert.equal(
    await db.passwordCredential.count({ where: { userId: u.id } }),
    1,
  );
  assert.equal(await db.session.count({ where: { userId: u.id } }), 0);
  assert.equal(await db.roleAssignment.count({ where: { userId: u.id } }), 0);
});

test("concurrent approvals produce one assignment, audit decision, in-app notification and captured release email", async () => {
  const i = await invite(manager);
  await accept(i);
  const responses = await Promise.all([
    decide(manager.token, i.id),
    decide(manager.token, i.id),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200],
  );
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.equal(
    await db.roleAssignment.count({ where: { userId: row.userId! } }),
    1,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { resourceId: i.id, action: "ACCESS_INVITATION_APPROVED" },
    }),
    1,
  );
  assert.equal(
    await db.userNotification.count({ where: { invitationId: i.id, kind: { in: ["ACCESS_APPROVED","ACCESS_REVOKED"] } } }),
    1,
  );
  assert.equal((await localMessages(i.email)).length, 2);
});

test("concurrent approve/revoke cannot resurrect access; final state is revoked", async () => {
  const i = await invite(manager);
  await accept(i);
  const responses = await Promise.all([
    decide(manager.token, i.id),
    close(manager.token, i.id),
  ]);
  assert.ok(responses.every((r) => [200, 409].includes(r.status)));
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.equal(row.status, "REVOKED");
  assert.equal(
    await db.roleAssignment.count({ where: { userId: row.userId! } }),
    0,
  );
});

test("concurrent resend/accept cannot accept a superseded token or confer IAM", async () => {
  const i = await invite(manager);
  const responses = await Promise.all([
    command(
      request("/api/admin/access-invitations", manager.token, {
        operation: "RESEND",
        id: i.id,
      }),
    ),
    accept(i),
  ]);
  assert.ok(responses.every((r) => [200, 400, 409].includes(r.status)));
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.ok(["PENDING_ACCEPTANCE", "PENDING_ASSIGNMENT"].includes(row.status));
  if (row.userId)
    assert.equal(
      await db.roleAssignment.count({ where: { userId: row.userId } }),
      0,
    );
  assert.equal((await accept(i)).status, 400);
});

test("sender demotion/revocation blocks outstanding consent and approval; Admin can revoke the stale request", async () => {
  const sender = await actor("PAP_MANAGER");
  const pending = await invite(sender),
    accepted = await invite(sender);
  await accept(accepted);
  await db.roleAssignment.deleteMany({ where: { userId: sender.user.id } });
  await assignSystemRole({ userId: sender.user.id, roleKey: "COMMERCIAL" });
  assert.ok([400, 403].includes((await accept(pending)).status));
  assert.equal((await decide(sender.token, accepted.id)).status, 403);
  assert.equal((await decide(admin.token, accepted.id)).status, 403);
  assert.equal((await close(admin.token, accepted.id)).status, 200);
});

test("target privilege changes and revoked MFA proof are rechecked inside authorization transactions", async () => {
  const i = await invite(manager);
  await accept(i);
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  await assignSystemRole({ userId: row.userId!, roleKey: "PAP_ADMIN" });
  assert.equal((await decide(manager.token, i.id)).status, 403);
  const before = await db.roleAssignment.count({
    where: { userId: row.userId! },
  });
  assert.equal(before, 1);
  const freshActor = await actor("PAP_MANAGER"),
    j = await invite(freshActor);
  await accept(j);
  await db.session.update({
    where: { id: freshActor.verified.session.id },
    data: { mfaVerifiedAt: null },
  });
  assert.equal((await decide(freshActor.token, j.id)).status, 403);
  assert.equal(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id: j.id } }))
      .status,
    "PENDING_ASSIGNMENT",
  );
});

test("old revoke endpoint closes C state and posts a persistent revocation notification without altering session/password/MFA", async () => {
  const i = await invite(manager);
  await accept(i);
  const token = await signIn(i.email, i.password);
  await decide(manager.token, i.id);
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  const result = await oldRevoke(
    request(
      `/api/admin/role-assignments/${row.assignmentId}`,
      manager.token,
      undefined,
      "DELETE",
    ),
    { params: Promise.resolve({ assignmentId: row.assignmentId! }) },
  );
  assert.equal(result.status, 200);
  assert.equal(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } }))
      .status,
    "REVOKED",
  );
  assert.equal(
    await db.userNotification.count({
      where: { invitationId: i.id, kind: "ACCESS_REVOKED" },
    }),
    1,
  );
  assert.ok(!!(await validateSession(token, { updateLastSeen: false })));
  assert.deepEqual(await resolveLoginNavigation(token), {
    view: "REDIRECT",
    destination: "/aguardando-autorizacao",
  });
});

test("existing password and MFA must be proven; bearer link cannot overwrite credentials or borrow another identity", async () => {
  const recipient = await actor();
  await db.roleAssignment.deleteMany({ where: { userId: recipient.user.id } });
  const fingerprint = await navigationFingerprint(recipient.user.id);
  const i = await invite(admin, "COMMERCIAL", recipient.user.email);
  i.password = password();
  assert.equal((await accept(i)).status, 403);
  i.password = recipient.password;
  assert.equal((await accept(i, admin.token)).status, 403);
  assert.equal((await accept(i, recipient.session.token)).status, 403);
  assert.ok(fingerprint === (await navigationFingerprint(recipient.user.id)));
  assert.equal((await accept(i, recipient.token)).status, 200);
  assert.ok(fingerprint === (await navigationFingerprint(recipient.user.id)));
});

test("a password changed between consent attempts is respected and never replaced", async () => {
  const u = await db.user.create({
    data: {
      email: `${randomUUID()}@synthetic.invalid`,
      displayName: "Identidade existente",
    },
  });
  const old = password(),
    current = password();
  await db.passwordCredential.create({
    data: {
      userId: u.id,
      passwordHash: await hashPassword(old),
      algorithm: "ARGON2ID",
    },
  });
  const i = await invite(admin, "COMMERCIAL", u.email);
  i.password = old;
  await db.passwordCredential.update({
    where: { userId: u.id },
    data: { passwordHash: await hashPassword(current) },
  });
  assert.equal((await accept(i)).status, 403);
  i.password = current;
  assert.equal((await accept(i)).status, 200);
  await signIn(u.email, current);
});

test("no approval before acceptance; rejection and revocation preserve identity credentials and valid primary sessions", async () => {
  const i = await invite(manager);
  assert.equal((await decide(manager.token, i.id)).status, 409);
  await accept(i);
  const token = await signIn(i.email, i.password);
  const u = await db.user.findUniqueOrThrow({ where: { email: i.email } });
  const before = await navigationFingerprint(u.id);
  assert.equal((await close(manager.token, i.id, "REJECT")).status, 200);
  assert.ok(before === (await navigationFingerprint(u.id)));
  assert.ok(!!(await validateSession(token, { updateLastSeen: false })));
  assert.equal((await decide(manager.token, i.id)).status, 409);
  const state = await (
    await ownStatus(request("/api/account/access-status", token))
  ).json();
  assert.equal(state.access.status, "REJECTED");
  assert.equal(state.access.canContinue, false);
});

test("scoped proposal requires Global approval and an existing active membership; never activates UBS or another tenant", async () => {
  const i = await invite(manager, "PROFESSIONAL");
  await accept(i);
  assert.equal(
    (
      await decide(manager.token, i.id, "PROFESSIONAL", {
        organizationId: manager.unit.id,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await decide(admin.token, i.id, "PROFESSIONAL", {
        organizationId: admin.unit.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } }))
      .status,
    "PENDING_ASSIGNMENT",
  );
  const u = await db.user.findUniqueOrThrow({ where: { email: i.email } });
  await db.membership.create({
    data: { userId: u.id, organizationId: admin.unit.id, status: "ACTIVE" },
  });
  const before = await db.organization.findMany({ orderBy: { id: "asc" } });
  assert.equal(
    (
      await decide(admin.token, i.id, "PROFESSIONAL", {
        organizationId: admin.unit.id,
      })
    ).status,
    200,
  );
  assert.ok(
    JSON.stringify(before) ===
      JSON.stringify(
        await db.organization.findMany({ orderBy: { id: "asc" } }),
      ),
  );
  const profile = await getEffectiveAccessProfile(u.id);
  assert.equal(profile!.organizations.length, 1);
  assert.equal(profile!.organizations[0].id, admin.unit.id);
  assert.ok(!profile!.organizations.some((o) => o.id === manager.unit.id));
  const token = await signIn(i.email, i.password);
  const denied = await clinical(
    request("/api/clinical/patients", token, undefined, "GET", {
      "x-organization-id": manager.unit.id,
    }),
    { params: Promise.resolve({ path: ["patients"] }) },
  );
  assert.equal(denied.status, 403);
});

test("notification read is self-scoped, persistent, idempotent and CSRF protected", async () => {
  const i = await invite(manager);
  await accept(i);
  await decide(manager.token, i.id);
  const token = await signIn(i.email, i.password);
  const n = await db.userNotification.findFirstOrThrow({
    where: { invitationId: i.id, kind: "ACCESS_APPROVED" },
  });
  assert.equal(
    (await notifications(request("/api/account/notifications"))).status,
    401,
  );
  assert.equal(
    (
      await notifications(
        request(`/api/account/notifications?userId=${admin.user.id}`, token),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await markRead(
        request(
          "/api/account/notifications",
          commercial.token,
          { id: n.id },
          "PATCH",
        ),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await markRead(
        request("/api/account/notifications", token, { id: n.id }, "PATCH", {
          origin: "https://attacker.invalid",
        }),
      )
    ).status,
    403,
  );
  const marks = await Promise.all([
    markRead(
      request("/api/account/notifications", token, { id: n.id }, "PATCH"),
    ),
    markRead(
      request("/api/account/notifications", token, { id: n.id }, "PATCH"),
    ),
  ]);
  assert.ok(marks.every((r) => r.status === 200));
  assert.ok(
    !!(await db.userNotification.findUniqueOrThrow({ where: { id: n.id } }))
      .readAt,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { resourceId: n.id, action: "ACCESS_NOTIFICATION_READ" },
    }),
    1,
  );
  const feed = await (
    await notifications(request("/api/account/notifications", token))
  ).json();
  assert.deepEqual(Object.keys(feed.notifications[0]).sort(), [
    "createdAt",
    "href",
    "id",
    "kind",
    "message",
    "readAt",
    "title",
  ]);
});

test("queue visibility, status pagination and own status do not leak another reviewer, recipient, tenant or reason", async () => {
  const i = await invite(otherManager);
  await accept(i);
  const result = await (
    await queue(
      request(
        "/api/admin/access-invitations?status=PENDING_ASSIGNMENT",
        manager.token,
      ),
    )
  ).json();
  assert.ok(!JSON.stringify(result).includes(i.email));
  const adminResult = await (
    await queue(
      request(
        "/api/admin/access-invitations?status=PENDING_ASSIGNMENT",
        admin.token,
      ),
    )
  ).json();
  assert.ok(adminResult.rows.some((r: { id: string }) => r.id === i.id));
  const token = await signIn(i.email, i.password);
  assert.equal(
    (
      await ownStatus(
        request("/api/account/access-status?userId=" + admin.user.id, token),
      )
    ).status,
    400,
  );
  const own = JSON.stringify(
    await (
      await ownStatus(request("/api/account/access-status", token))
    ).json(),
  );
  assert.ok(
    !own.includes(admin.user.email) &&
      !own.includes(manager.user.email) &&
      !own.includes("decisionReason") &&
      !own.includes("reviewedBy") &&
      !own.includes("organizationId"),
  );
  assert.equal(
    (
      await queue(
        request("/api/admin/access-invitations?page=-1", manager.token),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await queue(
        request(
          "/api/admin/access-invitations?status=ACTIVE&status=REVOKED",
          manager.token,
        ),
      )
    ).status,
    400,
  );
});

test("atomic distributed rate limits allow only one creation at the last quota slot", async () => {
  const f = await actor("PAP_MANAGER");
  const window = Math.floor(Date.now() / 3_600_000);
  const key = createHash("sha256")
    .update(`beta:v1:access-invitations/CREATE:${window}:${f.user.id}`)
    .digest("hex");
  await db.betaAbuseBucket.upsert({
    where: { key },
    create: { key, count: 29, expiresAt: new Date(Date.now() + 3_600_000) },
    update: { count: 29 },
  });
  const responses = await Promise.all(
    [1, 2].map(() =>
      command(
        request("/api/admin/access-invitations", f.token, {
          operation: "CREATE",
          email: `${randomUUID()}@synthetic.invalid`,
          displayName: "Limite sintético",
          proposedRoleKey: "COMMERCIAL",
        }),
      ),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 429]);
  assert.equal(
    await db.accessInvitation.count({ where: { invitedByUserId: f.user.id } }),
    1,
  );
});

test("public identity proof is throttled per hashed invitation token without storing secrets in buckets", async () => {
  const i = await invite(admin);
  const hash = createHash("sha256")
    .update("pap-saude:global-access:v1\0")
    .update(i.token)
    .digest("hex");
  const window = Math.floor(Date.now() / 3_600_000);
  const key = createHash("sha256")
    .update(`beta:v1:access-identity:${window}:${hash}`)
    .digest("hex");
  await db.betaAbuseBucket.create({
    data: { key, count: 10, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  const r = await accept(i);
  assert.equal(r.status, 429);
  assert.equal(await db.user.count({ where: { email: i.email } }), 0);
  assert.ok(!(await r.text()).includes(i.token));
});

test("public CSRF, query-string tokens, malformed/oversized bodies and unauthorized fields fail closed", async () => {
  const i = await invite(admin);
  assert.equal(
    (
      await consent(
        request(
          "/api/access-invitations/accept",
          undefined,
          { operation: "ACCEPT", token: i.token, password: i.password },
          "POST",
          { origin: "https://attacker.invalid" },
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await consent(
        request(
          "/api/access-invitations/accept?token=not-accepted",
          undefined,
          { operation: "INSPECT", token: i.token },
        ),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await consent(
        request("/api/access-invitations/accept", undefined, {
          operation: "ACCEPT",
          token: i.token,
          password: i.password,
          roleKey: "PAP_ADMIN",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await consent(
        request("/api/access-invitations/accept", undefined, {
          operation: "INSPECT",
          token: "invalid",
        }),
      )
    ).status,
    400,
  );
  const tooLarge = request("/api/access-invitations/accept", undefined, {
    operation: "INSPECT",
    token: "x".repeat(33000),
  });
  assert.equal((await consent(tooLarge)).status, 400);
});

test("C audit events and HTTP responses contain no invitation secret or password", async () => {
  const i = await invite(admin);
  await accept(i);
  await decide(admin.token, i.id);
  const audit = await db.auditEvent.findMany({ where: { resourceId: i.id } });
  const serialized = JSON.stringify(audit);
  assert.ok(!serialized.includes(i.token) && !serialized.includes(i.password));
  assert.ok(audit.some((r) => r.action === "ACCESS_INVITATION_ACCEPTED"));
  assert.ok(audit.some((r) => r.action === "ACCESS_INVITATION_APPROVED"));
  const response = JSON.stringify(
    await (
      await queue(request("/api/admin/access-invitations", admin.token))
    ).json(),
  );
  assert.ok(
    !response.includes(i.token) &&
      !response.includes("tokenHash") &&
      !response.includes("sessionToken"),
  );
});

test("exact session revocation after HTTP MFA guard but before transaction prevents approval", async () => {
  const f = await actor("PAP_MANAGER"),
    i = await invite(f);
  await accept(i);
  const r = await revokeBetweenGuardAndTransaction(f, i.id, () =>
    revokeSessionByToken(f.token, "ADMIN_REVOKED"),
  );
  assert.equal(r.status, 401);
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.equal(row.status, "PENDING_ASSIGNMENT");
  assert.equal(
    await db.roleAssignment.count({ where: { userId: row.userId! } }),
    0,
  );
});

test("IAM revocation between request guard and transaction is observed; cached role snapshot cannot authorize", async () => {
  const f = await actor("PAP_MANAGER"),
    i = await invite(f);
  await accept(i);
  const r = await revokeBetweenGuardAndTransaction(f, i.id, () =>
    db.roleAssignment.deleteMany({ where: { userId: f.user.id } }),
  );
  assert.equal(r.status, 403);
  assert.equal(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } }))
      .status,
    "PENDING_ASSIGNMENT",
  );
});

test("capture failure keeps an authorized in-app notification and retries without duplicate mail or privilege changes", async () => {
  const i = await invite(admin);
  await accept(i);
  const previous = process.env.PAP_LOCAL_DEMO;
  try {
    process.env.PAP_LOCAL_DEMO = "0";
    assert.equal((await decide(admin.token, i.id)).status, 200);
  } finally {
    process.env.PAP_LOCAL_DEMO = previous;
  }
  const n = await db.userNotification.findFirstOrThrow({
    where: { invitationId: i.id, kind: "ACCESS_APPROVED" },
  });
  assert.equal(n.emailStatus, "FAILED");
  assert.equal(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } }))
      .status,
    "ACTIVE",
  );
  for (let attempt = 0; attempt < 2; attempt++)
    assert.equal(
      (
        await command(
          request("/api/admin/access-invitations", admin.token, {
            operation: "RETRY_NOTICE",
            id: i.id,
          }),
        )
      ).status,
      200,
    );
  assert.equal(
    (await db.userNotification.findUniqueOrThrow({ where: { id: n.id } }))
      .emailStatus,
    "CAPTURED",
  );
  assert.equal((await localMessages(i.email)).length, 2);
});

test("invitation capture failure revokes the bearer link; C never sends through a real provider", async () => {
  const address = `${randomUUID()}@synthetic.invalid`,
    dir = process.env.PAP_LOCAL_MAIL_TEST_DIR,
    provider = process.env.PAP_EMAIL_PROVIDER;
  const body = {
    operation: "CREATE",
    email: address,
    displayName: "Teste de falha",
    proposedRoleKey: "COMMERCIAL",
  };
  try {
    process.env.PAP_LOCAL_MAIL_TEST_DIR = "/tmp/not-a-capture-directory";
    assert.equal(
      (
        await command(
          request("/api/admin/access-invitations", admin.token, body),
        )
      ).status,
      503,
    );
  } finally {
    process.env.PAP_LOCAL_MAIL_TEST_DIR = dir;
  }
  const row = await db.accessInvitation.findFirstOrThrow({
    where: { email: address },
  });
  assert.equal(row.status, "REVOKED");
  assert.equal(row.tokenHash, null);
  assert.equal(row.deliveryStatus, "FAILED");
  let network = 0;
  const spy = mock.method(globalThis, "fetch", async () => {
    network++;
    throw new Error("External sends blocked");
  });
  try {
    process.env.PAP_EMAIL_PROVIDER = "resend";
    assert.equal(
      (
        await command(
          request("/api/admin/access-invitations", admin.token, {
            ...body,
            email: `${randomUUID()}@synthetic.invalid`,
          }),
        )
      ).status,
      503,
    );
  } finally {
    process.env.PAP_EMAIL_PROVIDER = provider;
    spy.mock.restore();
  }
  assert.equal(network, 0);
});

test("database refuses ACTIVE consent without its matching authorized assignment, rolling back atomically", async () => {
  const i = await invite(admin);
  await accept(i);
  await assert.rejects(
    db.accessInvitation.update({
      where: { id: i.id },
      data: {
        status: "ACTIVE",
        decidedAt: new Date(),
        reviewedByUserId: admin.user.id,
      },
    }),
  );
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  assert.equal(row.status, "PENDING_ASSIGNMENT");
  assert.equal(
    await db.roleAssignment.count({ where: { userId: row.userId! } }),
    0,
  );
  assert.equal(
    await db.userNotification.count({ where: { invitationId: row.id, kind: { in: ["ACCESS_APPROVED","ACCESS_REVOKED"] } } }),
    0,
  );
});

test("profile authorization never activates UBS; a subsequently suspended scope is unavailable without lying about the approval state", async () => {
  const f = await actor(),
    i = await invite(f, "PROFESSIONAL");
  await accept(i);
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  await db.membership.create({
    data: { userId: row.userId!, organizationId: f.unit.id, status: "ACTIVE" },
  });
  assert.equal(
    (await decide(f.token, i.id, "PROFESSIONAL", { organizationId: f.unit.id }))
      .status,
    200,
  );
  await db.organization.update({
    where: { id: f.unit.id },
    data: { status: "SUSPENDED", isActive: false },
  });
  const token = await signIn(i.email, i.password);
  const body = await (
    await ownStatus(request("/api/account/access-status", token))
  ).json();
  assert.equal(body.access.status, "ACTIVE");
  assert.equal(body.access.canContinue, false);
  assert.equal(
    (
      await clinical(
        request("/api/clinical/patients", token, undefined, "GET", {
          "x-organization-id": f.unit.id,
        }),
        { params: Promise.resolve({ path: ["patients"] }) },
      )
    ).status,
    403,
  );
});

test("municipal proposal follows the existing scope policy: only Global with active municipality membership; wrong scope and clinical access denied", async () => {
  const f = await actor(),
    sender = await actor("PAP_MANAGER");
  const i = await invite(sender, "MUNICIPAL_ADMIN");
  await accept(i);
  const row = await db.accessInvitation.findUniqueOrThrow({
    where: { id: i.id },
  });
  const municipality = (
    await db.organization.findUniqueOrThrow({ where: { id: f.unit.id } })
  ).parentId!;
  assert.equal(
    (
      await decide(sender.token, i.id, "MUNICIPAL_ADMIN", {
        organizationId: municipality,
      })
    ).status,
    403,
  );
  await db.membership.create({
    data: { userId: row.userId!, organizationId: f.unit.id, status: "ACTIVE" },
  });
  assert.equal(
    (
      await decide(f.token, i.id, "MUNICIPAL_ADMIN", {
        organizationId: f.unit.id,
      })
    ).status,
    409,
  );
  assert.equal(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id: i.id } }))
      .status,
    "PENDING_ASSIGNMENT",
  );
  await db.membership.create({
    data: {
      userId: row.userId!,
      organizationId: municipality,
      status: "ACTIVE",
    },
  });
  assert.equal(
    (
      await decide(f.token, i.id, "MUNICIPAL_ADMIN", {
        organizationId: municipality,
      })
    ).status,
    200,
  );
  const profile = await getEffectiveAccessProfile(row.userId!);
  assert.ok(
    profile?.roles.some(
      (r) => r.key === "MUNICIPAL_ADMIN" && r.organization?.id === municipality,
    ),
  );
  assert.ok(!profile?.permissions.includes("patient.read"));
  const token = await signIn(i.email, i.password, false);
  assert.equal(
    (await organizations(request("/api/admin/organizations", token))).status,
    403,
  );
});

test("untrusted Host never poisons the captured invitation origin and scoped payload cannot turn a global role into a tenant grant", async () => {
  const address = `${randomUUID()}@synthetic.invalid`;
  const r = await command(
    request(
      "/api/admin/access-invitations",
      admin.token,
      {
        operation: "CREATE",
        email: address,
        displayName: "Origem sintética",
        proposedRoleKey: "COMMERCIAL",
      },
      "POST",
      { host: "attacker.invalid" },
    ),
  );
  assert.equal(r.status, 201);
  const mail = await localMessages(address),
    url = new URL(mail[0].html.match(/href="([^"]+)"/)![1]);
  assert.equal(url.origin, "http://127.0.0.1:3110");
  assert.equal(url.search, "");
  const id = (await r.json()).invitation.id;
  const i = {
    id,
    email: address,
    token: await invitationToken(address, id),
    password: password(),
  };
  await accept(i);
  assert.equal(
    (
      await decide(admin.token, id, "COMMERCIAL", {
        organizationId: admin.unit.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (await db.accessInvitation.findUniqueOrThrow({ where: { id } })).status,
    "PENDING_ASSIGNMENT",
  );
});

// C-AUDIT-01: the accepted proposal is a consent contract, including for Global.
async function consentSnapshot(id: string) {
  const row = await db.accessInvitation.findUniqueOrThrow({ where: { id } });
  return {
    row,
    grants: await db.roleAssignment.findMany({
      where: { userId: row.userId! },
      orderBy: { id: "asc" },
    }),
    // Acceptance notices already exist before a decision. Preserve both sets in
    // the denial fingerprint; only release/revocation notices count as grants.
    pendingNotifications: await db.userNotification.findMany({where:{invitationId:id,kind:"ACCESS_PENDING_DECISION"},orderBy:{id:"asc"}}),
    notifications: await db.userNotification.findMany({
      where: { invitationId: id, kind: { in: ["ACCESS_APPROVED","ACCESS_REVOKED"] } },
      orderBy: { id: "asc" },
    }),
    auditCount: await db.auditEvent.count(),
    captured: (await localMessages(row.email)).length,
  };
}

test("C-AUDIT-01: Admin cannot replace accepted Commercial or Professional roles; repeated/concurrent denials have no side effects", async () => {
  const admin = await actor();
  for (const [acceptedRole, deniedRole] of [
    ["COMMERCIAL", "PAP_MANAGER"],
    ["PROFESSIONAL", "HEALTH_UNIT_ADMIN"],
    ["PROFESSIONAL", "COMMERCIAL"],
  ]) {
    const i = await invite(admin, acceptedRole);
    assert.equal((await accept(i)).status, 200);
    const before = await consentSnapshot(i.id);
    for (let repetition = 0; repetition < 2; repetition++) {
      const results = await Promise.all([
        decide(admin.token, i.id, deniedRole, {
          organizationId:
            deniedRole === "HEALTH_UNIT_ADMIN" ? admin.unit.id : null,
        }),
        decide(admin.token, i.id, deniedRole, {
          organizationId:
            deniedRole === "HEALTH_UNIT_ADMIN" ? admin.unit.id : null,
        }),
      ]);
      for (const result of results) {
        assert.equal(result.status, 409);
        assert.equal((await result.json()).error, "INVITATION_ROLE_MISMATCH");
      }
      assert.deepEqual(await consentSnapshot(i.id), before);
    }
  }
});

test("C-AUDIT-01: Global approves only the accepted Professional role with legitimate scope and membership; replay never rewrites consent", async () => {
  const admin = await actor();
  const i = await invite(admin, "PROFESSIONAL");
  assert.equal((await accept(i)).status, 200);
  const pending = await consentSnapshot(i.id);
  assert.equal(
    (
      await decide(admin.token, i.id, "PROFESSIONAL", {
        organizationId: admin.unit.id,
      })
    ).status,
    400,
  );
  assert.deepEqual(await consentSnapshot(i.id), pending);
  await db.membership.create({
    data: {
      userId: pending.row.userId!,
      organizationId: admin.unit.id,
      status: "ACTIVE",
    },
  });
  assert.equal(
    (
      await decide(admin.token, i.id, "PROFESSIONAL", {
        organizationId: admin.unit.id,
      })
    ).status,
    200,
  );
  const approved = await consentSnapshot(i.id);
  assert.equal(approved.row.proposedRoleKey, "PROFESSIONAL");
  assert.equal(approved.grants.length, 1);
  assert.equal(approved.notifications.length, 1);
  assert.equal((await decide(admin.token, i.id, "PAP_MANAGER")).status, 409);
  assert.deepEqual(await consentSnapshot(i.id), approved);
  assert.equal(
    (
      await decide(admin.token, i.id, "PROFESSIONAL", {
        organizationId: admin.unit.id,
      })
    ).status,
    200,
  );
  assert.deepEqual(await consentSnapshot(i.id), approved);
});

test("C-AUDIT-01: racing legitimate and substituted approvals preserve one Commercial grant and delegated ownership", async () => {
  const manager = await actor("PAP_MANAGER");
  const admin = await actor();
  const i = await invite(manager);
  assert.equal((await accept(i)).status, 200);
  const accepted = (await consentSnapshot(i.id)).row;
  assert.equal((await decide(otherManager.token, i.id)).status, 404);
  assert.equal((await decide(manager.token, i.id, "PAP_MANAGER")).status, 403);
  const results = await Promise.all([
    decide(admin.token, i.id, "PAP_MANAGER"),
    decide(manager.token, i.id),
    decide(admin.token, i.id),
    decide(admin.token, i.id, "PAP_MANAGER"),
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    [409, 200, 200, 409],
  );
  const final = await consentSnapshot(i.id);
  assert.equal(final.row.proposedRoleKey, "COMMERCIAL");
  assert.deepEqual(final.row.acceptedAt, accepted.acceptedAt);
  assert.equal(final.grants.length, 1);
  assert.equal(final.notifications.length, 1);
  assert.equal(final.captured, 2);
  const grantedRole = await db.role.findUniqueOrThrow({
    where: { id: final.grants[0].roleId },
  });
  assert.equal(grantedRole.key, "COMMERCIAL");
  assert.equal(
    await db.auditEvent.count({
      where: { resourceId: i.id, action: "ACCESS_INVITATION_APPROVED" },
    }),
    1,
  );
});

test("C-AUDIT-01: a different role needs a new invitation and explicit acceptance, preserving the closed original proposal", async () => {
  const admin = await actor();
  const original = await invite(admin);
  assert.equal((await accept(original)).status, 200);
  assert.equal((await close(admin.token, original.id, "REJECT")).status, 200);
  const closed = await db.accessInvitation.findUniqueOrThrow({
    where: { id: original.id },
  });
  const replacement = await invite(admin, "PAP_MANAGER", original.email);
  replacement.password = original.password;
  assert.equal(
    (await decide(admin.token, replacement.id, "PAP_MANAGER")).status,
    409,
  );
  assert.equal(
    await db.roleAssignment.count({ where: { userId: closed.userId! } }),
    0,
  );
  assert.equal((await accept(replacement)).status, 200);
  assert.equal(
    (await decide(admin.token, replacement.id, "PAP_MANAGER")).status,
    200,
  );
  assert.deepEqual(
    await db.accessInvitation.findUniqueOrThrow({ where: { id: original.id } }),
    closed,
  );
  assert.equal(closed.proposedRoleKey, "COMMERCIAL");
});
