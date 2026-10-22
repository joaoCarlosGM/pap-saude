import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import * as OTPAuth from "otpauth";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createSession } from "../../src/server/auth/session.service";
import { hashPassword } from "../../src/server/auth/password";
import { authenticateLogin } from "../../src/server/auth/login.service";
import {
  completeMfaLogin,
  completeMfaLoginWithRecoveryCode,
} from "../../src/server/auth/mfa-login.service";
import { generateRecoveryCodes } from "../../src/server/auth/recovery-code.service";
import * as organizations from "../../src/app/api/admin/organizations/route";
import { PATCH as organizationPATCH } from "../../src/app/api/admin/organizations/[organizationId]/route";
import { POST as assignmentPOST } from "../../src/app/api/admin/role-assignments/route";
import { DELETE as assignmentDELETE } from "../../src/app/api/admin/role-assignments/[assignmentId]/route";
import * as security from "../../src/app/api/admin/security/route";
import * as invitations from "../../src/app/api/admin/invitations/route";
import { GET as rolesGET } from "../../src/app/api/admin/roles/route";
import { GET as usersGET } from "../../src/app/api/admin/users/route";
import { GET as auditGET } from "../../src/app/api/admin/audit/route";
import { GET as metricsGET } from "../../src/app/api/admin/operations/metrics/route";
import { GET as monitoringGET } from "../../src/app/api/admin/operations/monitoring/route";
import { GET as integrationsGET } from "../../src/app/api/admin/operations/integrations/route";
import * as betaRequests from "../../src/app/api/admin/beta/requests/route";
import * as betaInvitations from "../../src/app/api/admin/beta/invitations/route";
import { GET as betaMetrics } from "../../src/app/api/admin/beta/metrics/route";
import { GET as betaUsers } from "../../src/app/api/admin/beta/users/route";
import { GET as contextGET } from "../../src/app/api/admin/context/route";
import * as selfSecurity from "../../src/app/api/auth/security/route";
const origin = "http://localhost:3000",
  password = "Synthetic-Mfa-Review!2026";
function req(path: string, token?: string, method = "GET", body?: unknown) {
  return new NextRequest(origin + path, {
    method,
    headers: {
      origin,
      "Content-Type": "application/json",
      ...(token ? { cookie: `pap_session=${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
after(() => db.$disconnect());
test("all privileged administrative routes require verified MFA, with IAM and bootstrap preserved", async (t) => {
  assert.equal(
    (
      await db.$queryRaw<
        Array<{ name: string }>
      >`SELECT current_database() AS name`
    )[0].name,
    "pap_saude_admin_mfa_test",
  );
  await bootstrapSystemIam();
  const actor = await db.user.create({
    data: {
      email: "review-admin@synthetic.invalid",
      displayName: "Synthetic PAP Admin",
    },
  });
  await db.passwordCredential.create({
    data: {
      userId: actor.id,
      passwordHash: await hashPassword(password),
      algorithm: "ARGON2ID",
    },
  });
  await assignSystemRole({ userId: actor.id, roleKey: "PAP_ADMIN" });
  const pap = await db.organization.create({
    data: { type: "PAP", name: "Synthetic PAP", status: "ACTIVE" },
  });
  const municipality = await db.organization.create({
    data: {
      type: "MUNICIPALITY",
      name: "Synthetic City",
      parentId: pap.id,
      status: "ACTIVE",
    },
  });
  const unit = await db.organization.create({
    data: {
      type: "HEALTH_UNIT",
      name: "Synthetic UBS",
      parentId: municipality.id,
      status: "ACTIVE",
    },
  });
  const target = await db.user.create({
    data: {
      email: "review-target@synthetic.invalid",
      displayName: "Synthetic Target",
    },
  });
  await db.membership.create({
    data: { userId: target.id, organizationId: unit.id, status: "ACTIVE" },
  });
  const assignment = await assignSystemRole({
    userId: target.id,
    roleKey: "PROFESSIONAL",
    organizationId: unit.id,
  });
  const targetSession = await createSession({ userId: target.id });
  const enabled = new Date(Date.now() - 2000);
  await db.mfaFactor.create({
    data: {
      userId: target.id,
      type: "TOTP",
      status: "ACTIVE",
      secretEncrypted: "synthetic-target-only",
      createdAt: enabled,
      enabledAt: enabled,
    },
  });
  const primary = await createSession({ userId: actor.id });
  const mutations: Array<
    [string, (r: NextRequest) => Promise<Response>, string, unknown]
  > = [
    [
      "/api/admin/organizations",
      organizations.POST,
      "POST",
      {
        type: "HEALTH_UNIT",
        name: "Unauthorized creation",
        parentId: municipality.id,
      },
    ],
    ...["ACTIVATE", "SUSPEND", "ARCHIVE", "UPDATE"].map(
      (operation) =>
        [
          `/api/admin/organizations/${unit.id}`,
          (r: NextRequest) =>
            organizationPATCH(r, {
              params: Promise.resolve({ organizationId: unit.id }),
            }),
          "PATCH",
          { operation, name: "Unauthorized update" },
        ] as [string, (r: NextRequest) => Promise<Response>, string, unknown],
    ),
    [
      "/api/admin/role-assignments",
      assignmentPOST,
      "POST",
      {
        userId: actor.id,
        roleKey: "HEALTH_UNIT_ADMIN",
        organizationId: unit.id,
      },
    ],
    [
      `/api/admin/role-assignments/${assignment.id}`,
      (r) =>
        assignmentDELETE(r, {
          params: Promise.resolve({ assignmentId: assignment.id }),
        }),
      "DELETE",
      undefined,
    ],
    ...["REVOKE_SESSION", "REVOKE_ALL_SESSIONS", "RESET_MFA"].map(
      (action) =>
        [
          "/api/admin/security",
          security.POST,
          "POST",
          {
            action,
            targetUserId: target.id,
            sessionId: targetSession.session.id,
            reason: "Synthetic adversarial review",
          },
        ] as [string, (r: NextRequest) => Promise<Response>, string, unknown],
    ),
    [
      "/api/admin/invitations",
      invitations.POST,
      "POST",
      {
        organizationId: unit.id,
        email: "invite@synthetic.invalid",
        displayName: "Synthetic Invite",
      },
    ],
    [
      "/api/admin/beta/requests",
      betaRequests.POST,
      "POST",
      {
        id: randomUUID(),
        decision: "APPROVE",
        municipalityId: municipality.id,
        reason: "Unauthorized approval",
      },
    ],
    ...["BOOTSTRAP", "INVITE", "RESEND", "REVOKE"].map(
      (operation) =>
        [
          "/api/admin/beta/invitations",
          betaInvitations.POST,
          "POST",
          {
            operation,
            organizationId: unit.id,
            id: randomUUID(),
            email: "beta@synthetic.invalid",
            displayName: "Synthetic Invite",
          },
        ] as [string, (r: NextRequest) => Promise<Response>, string, unknown],
    ),
  ];
  const reads: Array<[string, (r: NextRequest) => Promise<Response>]> = [
    ["/api/admin/organizations", organizations.GET],
    ["/api/admin/security", security.GET],
    ["/api/admin/users", usersGET],
    ["/api/admin/roles", rolesGET],
    ["/api/admin/audit", auditGET],
    ["/api/admin/operations/metrics", metricsGET],
    ["/api/admin/operations/monitoring", monitoringGET],
    ["/api/admin/operations/integrations", integrationsGET],
    ["/api/admin/beta/requests", betaRequests.GET],
    [
      `/api/admin/beta/invitations?organizationId=${unit.id}`,
      betaInvitations.GET,
    ],
    ["/api/admin/beta/metrics", betaMetrics],
    ["/api/admin/beta/users", betaUsers],
  ];
  async function snapshot() {
    return {
      orgs: await db.organization.findMany({ orderBy: { id: "asc" } }),
      roles: await db.roleAssignment.findMany({ orderBy: { id: "asc" } }),
      targetSession: await db.session.findUnique({
        where: { id: targetSession.session.id },
        select: { revokedAt: true, revocationReason: true },
      }),
      factors: await db.mfaFactor.findMany({ orderBy: { id: "asc" } }),
      invitations: await db.userInvitation.count(),
      audit: await db.auditEvent.count(),
    };
  }
  async function deniedEverywhere(token: string) {
    const before = await snapshot();
    for (const [path, handler, method, body] of mutations) {
      const r = await handler(req(path, token, method, body));
      assert.equal(r.status, 403, `${method} ${path}`);
      assert.deepEqual(
        await r.json(),
        { error: "ADMIN_MFA_REQUIRED" },
        `${method} ${path}`,
      );
      assert.match(r.headers.get("cache-control") || "", /no-store/);
    }
    for (const [path, handler] of reads) {
      const r = await handler(req(path, token));
      assert.equal(r.status, 403, path);
      assert.deepEqual(await r.json(), { error: "ADMIN_MFA_REQUIRED" }, path);
    }
    assert.deepEqual(
      await snapshot(),
      before,
      "denied requests must not mutate privileged state or emit success audit",
    );
  }
  await t.test(
    "password-only PAP admin cannot use any legacy or beta privileged route",
    () => deniedEverywhere(primary.token),
  );
  await t.test(
    "missing session is still 401, not an MFA enrollment error",
    async () => {
      assert.equal(
        (await organizations.GET(req("/api/admin/organizations"))).status,
        401,
      );
    },
  );
  let secret = "",
    factorId = "",
    verifiedToken = "";
  await t.test(
    "initial MFA configuration and context remain accessible with primary session",
    async () => {
      assert.equal(
        (await contextGET(req("/api/admin/context", primary.token))).status,
        200,
      );
      assert.equal(
        (await selfSecurity.GET(req("/api/auth/security", primary.token)))
          .status,
        200,
      );
      const started = await selfSecurity.POST(
        req("/api/auth/security", primary.token, "POST", {
          action: "START_MFA",
          password,
        }),
      );
      assert.equal(started.status, 200);
      const data = await started.json();
      secret = data.secret;
      factorId = data.factorId;
      assert.ok(secret);
      assert.ok(factorId);
      await deniedEverywhere(primary.token); // PENDING enrollment grants no administrative authority.
    },
  );
  await t.test(
    "session remains unverified after initial enrollment; TOTP login unlocks IAM-authorized routes",
    async () => {
      const generator = new OTPAuth.TOTP({
        issuer: "PAP Saúde",
        label: actor.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });
      // Complete enrollment in a prior step so login uses a fresh counter without sleeps.
      const confirmed = await selfSecurity.POST(
        req("/api/auth/security", primary.token, "POST", {
          action: "CONFIRM_MFA",
          password,
          factorId,
          code: generator.generate({ timestamp: Date.now() - 30000 }),
        }),
      );
      assert.equal(confirmed.status, 200);
      await deniedEverywhere(primary.token); // Active factor alone is not proof for this session.
      const login = await authenticateLogin({
        email: actor.email,
        password,
        origin: "synthetic-mfa-review",
      });
      assert.equal(login.status, "MFA_REQUIRED");
      if (login.status !== "MFA_REQUIRED") throw new Error();
      const authenticated = await completeMfaLogin({
        challengeToken: login.challengeToken,
        code: generator.generate(),
      });
      verifiedToken = authenticated.sessionToken;
      assert.equal(
        (
          await organizations.GET(
            req("/api/admin/organizations", verifiedToken),
          )
        ).status,
        200,
      );
      const updated = await organizationPATCH(
        req(`/api/admin/organizations/${unit.id}`, verifiedToken, "PATCH", {
          operation: "UPDATE",
          name: "MFA-authorized update",
        }),
        { params: Promise.resolve({ organizationId: unit.id }) },
      );
      assert.equal(updated.status, 200);
      assert.equal(
        (await db.organization.findUniqueOrThrow({ where: { id: unit.id } }))
          .name,
        "MFA-authorized update",
      );
    },
  );
  await t.test(
    "recovery code login also supplies MFA proof without bypassing IAM",
    async () => {
      const recovery = await generateRecoveryCodes(actor.id);
      const login = await authenticateLogin({
        email: actor.email,
        password,
        origin: "synthetic-recovery-review",
      });
      assert.equal(login.status, "MFA_REQUIRED");
      if (login.status !== "MFA_REQUIRED") throw new Error();
      const authenticated = await completeMfaLoginWithRecoveryCode({
        challengeToken: login.challengeToken,
        recoveryCode: recovery.codes[0],
      });
      assert.equal(
        (
          await organizations.GET(
            req("/api/admin/organizations", authenticated.sessionToken),
          )
        ).status,
        200,
      );
      assert.equal(
        (await selfSecurity.GET(req("/api/auth/security", primary.token)))
          .status,
        200,
      );
    },
  );
  await t.test("verified MFA cannot grant absent IAM permission", async () => {
    const plain = await db.user.create({
      data: {
        email: "no-role@synthetic.invalid",
        displayName: "Synthetic No Role",
      },
    });
    const now = new Date();
    await db.mfaFactor.create({
      data: {
        userId: plain.id,
        type: "TOTP",
        status: "ACTIVE",
        secretEncrypted: "synthetic-fixture-only",
        createdAt: now,
        enabledAt: now,
      },
    });
    const session = await createSession({
      userId: plain.id,
      mfaVerified: true,
    });
    const r = await organizations.GET(
      req("/api/admin/organizations", session.token),
    );
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error, "ACCESS_DENIED");
    assert.equal(
      (
        await organizationPATCH(
          req(`/api/admin/organizations/${unit.id}`, session.token, "PATCH", {
            operation: "SUSPEND",
          }),
          { params: Promise.resolve({ organizationId: unit.id }) },
        )
      ).status,
      403,
    );
  });
  await t.test(
    "factor revocation and replacement invalidate prior session assurance",
    async () => {
      await db.mfaFactor.update({
        where: { id: factorId },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await deniedEverywhere(verifiedToken);
      const now = new Date();
      await db.mfaFactor.create({
        data: {
          userId: actor.id,
          type: "TOTP",
          status: "ACTIVE",
          secretEncrypted: "synthetic-replacement",
          createdAt: now,
          enabledAt: new Date(now.getTime() + 1),
        },
      });
      await deniedEverywhere(verifiedToken);
    },
  );
});
