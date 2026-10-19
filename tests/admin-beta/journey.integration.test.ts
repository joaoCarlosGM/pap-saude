import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import * as OTPAuth from "otpauth";
import { NextRequest } from "next/server";
import { GET as betaUsers } from "../../src/app/api/admin/beta/users/route";
import { POST as legacyInvite } from "../../src/app/api/admin/invitations/route";
import { GET as clinicalGET } from "../../src/app/api/clinical/[[...path]]/route";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { hashPassword } from "../../src/server/auth/password";
import { createSession } from "../../src/server/auth/session.service";
import {
  startTotpEnrollment,
  confirmTotpEnrollment,
} from "../../src/server/auth/totp.service";
import { authenticateLogin } from "../../src/server/auth/login.service";
import { completeMfaLogin } from "../../src/server/auth/mfa-login.service";
import { POST as submit } from "../../src/app/api/organization-requests/route";
import {
  GET as queue,
  POST as review,
} from "../../src/app/api/admin/beta/requests/route";
import {
  GET as invitations,
  POST as invite,
} from "../../src/app/api/admin/beta/invitations/route";
import { GET as metrics } from "../../src/app/api/admin/beta/metrics/route";
import { POST as accept } from "../../src/app/api/invitations/accept/route";
import { inspectInvitation } from "../../src/server/invitations/invitation.service";
import { requirePermission } from "../../src/server/iam/authorization.service";
import { PERMISSIONS } from "../../src/server/iam/permissions";
import {
  createEncounter,
  startEncounter,
  completeEncounter,
} from "../../src/server/encounters/encounter.service";
import { csvCell } from "../../src/server/admin-beta/metrics.service";
import { betaRateLimit } from "../../src/server/admin-beta/policy";

const password = "Synthetic-Beta1-Password!2026",
  origin = "http://localhost:3000";
const realFetch = global.fetch;
const links: string[] = [];
let providerStatus = 200;
let deliveryMode: "normal" | "timeout" = "normal";
global.fetch = async (input, init) => {
  assert.equal(
    String(input),
    "https://api.resend.com/emails",
    "tests must never call external infrastructure",
  );
  assert.ok(init?.signal, "provider has timeout");
  assert.ok(new Headers(init?.headers).get("Idempotency-Key"));
  const body = JSON.parse(String(init?.body));
  const match = body.text.match(/http[^\s]+\/convite\?token=[^\s]+/);
  assert.ok(match);
  links.push(match[0]);
  assert.ok(body.html.includes("#064f50"));
  if (deliveryMode === "timeout")
    throw new DOMException("timed out", "TimeoutError");
  return new Response(JSON.stringify({ id: randomUUID() }), {
    status: providerStatus,
  });
};
after(async () => {
  global.fetch = realFetch;
  await db.$disconnect();
});
function req(
  path: string,
  token?: string,
  body?: unknown,
  requestOrigin = origin,
) {
  return new NextRequest(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin: requestOrigin,
      "Content-Type": "application/json",
      ...(token ? { cookie: `pap_session=${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const invitationToken = () => new URL(links.at(-1)!).searchParams.get("token")!;
async function mfaSession(userId: string, email: string) {
  const previous = new Date(Date.now() - 65000);
  const enrollment = await startTotpEnrollment({ userId, now: previous });
  const generator = new OTPAuth.TOTP({
    issuer: "PAP Saúde",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: enrollment.secret,
  });
  await confirmTotpEnrollment({
    userId,
    factorId: enrollment.factorId,
    code: generator.generate({ timestamp: previous.getTime() }),
    now: previous,
  });
  const primary = await authenticateLogin({
    email,
    password,
    origin: "synthetic-beta-tests",
  });
  assert.equal(primary.status, "MFA_REQUIRED");
  if (primary.status !== "MFA_REQUIRED") throw new Error("MFA not enforced");
  const authenticated = await completeMfaLogin({
    challengeToken: primary.challengeToken,
    code: generator.generate(),
  });
  assert.ok(
    (
      await db.session.findUniqueOrThrow({
        where: { id: authenticated.session.id },
      })
    ).mfaVerifiedAt,
  );
  return authenticated.sessionToken;
}
test("institutional onboarding journey, provider contract and adversarial boundaries", async (t) => {
  const database = await db.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  assert.equal(database[0].name, "pap_saude_beta1_test");
  await bootstrapSystemIam();
  const pap = await db.organization.create({
    data: { type: "PAP", name: "Synthetic PAP", status: "ACTIVE" },
  });
  const municipality = await db.organization.create({
    data: {
      type: "MUNICIPALITY",
      name: "Synthetic City",
      city: "Cidade Teste",
      state: "SP",
      parentId: pap.id,
      status: "ACTIVE",
    },
  });
  const wrong = await db.organization.create({
    data: {
      type: "MUNICIPALITY",
      name: "Other City",
      city: "Outra Cidade",
      state: "SP",
      parentId: pap.id,
      status: "ACTIVE",
    },
  });
  const admin = await db.user.create({
    data: { email: "pap@synthetic.invalid", displayName: "Synthetic PAP" },
  });
  await db.passwordCredential.create({
    data: {
      userId: admin.id,
      passwordHash: await hashPassword(password),
      algorithm: "ARGON2ID",
    },
  });
  await assignSystemRole({ userId: admin.id, roleKey: "PAP_ADMIN" });
  const adminToken = await mfaSession(admin.id, admin.email);
  const publicBody = {
    name: "UBS Sintética",
    city: "Cidade Teste",
    state: "SP",
    address: "Rua Sintética 10",
    cnes: "7654321",
    cnpj: "12345678000199",
    contactName: "Responsável Teste",
    contactEmail: "responsavel@synthetic.invalid",
    contactPhone: "11999999999",
    consent: true,
  };
  let candidateId = "",
    unitId = "",
    responsibleId = "",
    responsibleToken = "",
    professionalId = "";
  await t.test(
    "public validation, CSRF and uniform duplicate responses",
    async () => {
      assert.equal(
        (
          await submit(
            req("/api/organization-requests", undefined, {
              ...publicBody,
              consent: false,
            }),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await submit(
            req("/api/organization-requests", undefined, {
              ...publicBody,
              roleKey: "PAP_ADMIN",
            }),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await submit(
            req("/api/organization-requests", undefined, {
              ...publicBody,
              name: "<script>",
            }),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await submit(
            req(
              "/api/organization-requests",
              undefined,
              publicBody,
              "https://evil.invalid",
            ),
          )
        ).status,
        403,
      );
      const outcomes = await Promise.all(
        Array.from({ length: 3 }, () =>
          submit(req("/api/organization-requests", undefined, publicBody)),
        ),
      );
      for (const r of outcomes) {
        assert.equal(r.status, 202);
        assert.deepEqual(await r.json(), { received: true });
      }
      assert.equal(await db.organizationCandidate.count(), 1);
      assert.equal(await db.organizationRequest.count(), 1);
      const candidate = await db.organizationCandidate.findFirstOrThrow();
      candidateId = candidate.id;
      assert.equal(
        await db.user.count({ where: { email: publicBody.contactEmail } }),
        0,
      );
      const rows = await queue(req("/api/admin/beta/requests", adminToken));
      assert.equal(rows.status, 200);
      assert.equal(
        (await rows.json()).rows[0].contactEmail,
        publicBody.contactEmail,
      );
    },
  );
  await t.test(
    "no session, no MFA and clinical access are denied",
    async () => {
      assert.equal((await queue(req("/api/admin/beta/requests"))).status, 401);
      const noMfa = await createSession({ userId: admin.id });
      assert.equal(
        (await queue(req("/api/admin/beta/requests", noMfa.token))).status,
        403,
      );
      assert.equal(
        (
          await legacyInvite(
            req("/api/admin/invitations", noMfa.token, {
              organizationId: municipality.id,
              email: "bypass@synthetic.invalid",
              displayName: "No MFA",
            }),
          )
        ).status,
        403,
      );
      await assert.rejects(
        requirePermission({
          userId: admin.id,
          organizationId: municipality.id,
          permission: PERMISSIONS.PATIENT_READ,
        }),
      );
    },
  );
  await t.test(
    "wrong municipality rejected, double approval idempotent, audit private",
    async () => {
      assert.equal(
        (
          await review(
            req("/api/admin/beta/requests", adminToken, {
              id: candidateId,
              decision: "APPROVE",
              municipalityId: wrong.id,
              reason: "Validation completed",
            }),
          )
        ).status,
        400,
      );
      const results = await Promise.all(
        [1, 2].map(() =>
          review(
            req("/api/admin/beta/requests", adminToken, {
              id: candidateId,
              decision: "APPROVE",
              municipalityId: municipality.id,
              reason: "Synthetic verification completed",
            }),
          ),
        ),
      );
      for (const r of results) {
        assert.equal(r.status, 200);
        const data = await r.json();
        unitId = data.organizationId;
      }
      assert.equal(
        await db.organization.count({ where: { type: "HEALTH_UNIT" } }),
        1,
      );
      const org = await db.organization.findUniqueOrThrow({
        where: { id: unitId },
      });
      assert.equal(org.parentId, municipality.id);
      assert.equal(org.status, "ACTIVE");
      assert.equal(org.isActive, true);
      assert.equal(
        await db.auditEvent.count({ where: { action: "REQUEST_APPROVED" } }),
        1,
      );
      const audit = JSON.stringify(await db.auditEvent.findMany());
      assert.ok(!audit.includes(publicBody.contactEmail));
      assert.ok(!audit.includes(publicBody.contactPhone));
    },
  );
  await t.test(
    "bootstrap invitation, real token acceptance and MFA login",
    async () => {
      const result = await invite(
        req("/api/admin/beta/invitations", adminToken, {
          operation: "BOOTSTRAP",
          organizationId: unitId,
        }),
      );
      assert.equal(result.status, 201);
      const response = await result.json();
      assert.equal(response.invitation.roleKey, "HEALTH_UNIT_ADMIN");
      assert.equal(response.delivery.mode, "RESEND");
      assert.equal(response.developmentUrl, undefined);
      const token = invitationToken();
      assert.equal(
        (await inspectInvitation(token)).roleKey,
        "HEALTH_UNIT_ADMIN",
      );
      const record = await db.userInvitation.findUniqueOrThrow({
        where: { id: response.invitation.id },
      });
      assert.notEqual(record.tokenHash, token);
      assert.equal(record.deliveryStatus, "SENT");
      const activated = await accept(
        req("/api/invitations/accept", undefined, { token, password }),
      );
      assert.equal(activated.status, 200);
      responsibleId = (await activated.json()).userId;
      assert.equal(
        (
          await accept(
            req("/api/invitations/accept", undefined, { token, password }),
          )
        ).status,
        410,
      );
      const role = await db.roleAssignment.findFirstOrThrow({
        where: { userId: responsibleId },
        include: { role: true },
      });
      assert.equal(role.organizationId, unitId);
      assert.equal(role.role.key, "HEALTH_UNIT_ADMIN");
      responsibleToken = await mfaSession(
        responsibleId,
        publicBody.contactEmail,
      );
    },
  );
  await t.test(
    "existing identity keeps password and other memberships; duplicate active membership conflicts",
    async () => {
      const other = await db.organization.create({
        data: {
          type: "HEALTH_UNIT",
          name: "Other synthetic unit",
          parentId: wrong.id,
          status: "ACTIVE",
        },
      });
      const user = await db.user.create({
        data: {
          email: "existing@synthetic.invalid",
          displayName: "Existing Synthetic Identity",
        },
      });
      const passwordHash = await hashPassword(password);
      await db.passwordCredential.create({
        data: { userId: user.id, passwordHash, algorithm: "ARGON2ID" },
      });
      await db.membership.create({
        data: { userId: user.id, organizationId: other.id, status: "ACTIVE" },
      });
      await assignSystemRole({
        userId: user.id,
        organizationId: other.id,
        roleKey: "PROFESSIONAL",
      });
      const created = await invite(
        req("/api/admin/beta/invitations", responsibleToken, {
          operation: "INVITE",
          organizationId: unitId,
          email: user.email,
          displayName: user.displayName,
        }),
      );
      assert.equal(created.status, 201);
      const token = invitationToken();
      assert.equal((await inspectInvitation(token)).requiresPassword, false);
      assert.equal(
        (await accept(req("/api/invitations/accept", undefined, { token })))
          .status,
        200,
      );
      assert.equal(
        (
          await db.passwordCredential.findUniqueOrThrow({
            where: { userId: user.id },
          })
        ).passwordHash,
        passwordHash,
      );
      assert.equal(
        await db.membership.count({
          where: { userId: user.id, status: "ACTIVE" },
        }),
        2,
      );
      assert.equal(
        (
          await invite(
            req("/api/admin/beta/invitations", responsibleToken, {
              operation: "INVITE",
              organizationId: unitId,
              email: user.email,
              displayName: user.displayName,
            }),
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await invite(
            req("/api/admin/beta/invitations", adminToken, {
              operation: "BOOTSTRAP",
              organizationId: unitId,
            }),
          )
        ).status,
        409,
      );
    },
  );
  await t.test(
    "UBS cannot bootstrap, review, cross tenants or escalate",
    async () => {
      assert.equal(
        (await queue(req("/api/admin/beta/requests", responsibleToken))).status,
        403,
      );
      assert.equal(
        (
          await invite(
            req("/api/admin/beta/invitations", responsibleToken, {
              operation: "BOOTSTRAP",
              organizationId: unitId,
            }),
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await invite(
            req("/api/admin/beta/invitations", responsibleToken, {
              operation: "INVITE",
              organizationId: wrong.id,
              email: "bad@synthetic.invalid",
              displayName: "Bad Scope",
            }),
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await invite(
            req("/api/admin/beta/invitations", responsibleToken, {
              operation: "INVITE",
              organizationId: unitId,
              roleKey: "PAP_ADMIN",
              email: "bad@synthetic.invalid",
              displayName: "Bad Role",
            }),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await invite(
            req(
              "/api/admin/beta/invitations",
              responsibleToken,
              {
                operation: "INVITE",
                organizationId: unitId,
                email: "bad@synthetic.invalid",
                displayName: "Bad Origin",
              },
              "https://evil.invalid",
            ),
          )
        ).status,
        403,
      );
    },
  );
  await t.test(
    "provider 4xx, 5xx and timeout revoke links, retry rotates token",
    async () => {
      for (const mode of ["4xx", "5xx", "timeout"]) {
        providerStatus = mode === "4xx" ? 422 : 500;
        deliveryMode = mode === "timeout" ? "timeout" : "normal";
        const r = await invite(
          req("/api/admin/beta/invitations", responsibleToken, {
            operation: "INVITE",
            organizationId: unitId,
            email: `${mode}@synthetic.invalid`,
            displayName: "Synthetic failure",
          }),
        );
        assert.equal(r.status, 503);
        const failed = await db.userInvitation.findFirstOrThrow({
          where: { email: `${mode}@synthetic.invalid` },
        });
        assert.equal(failed.status, "REVOKED");
        assert.equal(failed.deliveryStatus, "FAILED");
        await assert.rejects(inspectInvitation(invitationToken()));
        const old = invitationToken();
        providerStatus = 200;
        deliveryMode = "normal";
        const retry = await invite(
          req("/api/admin/beta/invitations", responsibleToken, {
            operation: "RESEND",
            organizationId: unitId,
            id: failed.id,
          }),
        );
        assert.equal(retry.status, 201);
        assert.notEqual(invitationToken(), old);
        await assert.rejects(inspectInvitation(old));
      }
    },
  );
  await t.test(
    "professional accept, revoke, expired and concurrent acceptance",
    async () => {
      const created = await invite(
        req("/api/admin/beta/invitations", responsibleToken, {
          operation: "INVITE",
          organizationId: unitId,
          email: "professional@synthetic.invalid",
          displayName: "Professional Test",
        }),
      );
      assert.equal(created.status, 201);
      const token = invitationToken();
      const results = await Promise.all(
        [1, 2].map(() =>
          accept(
            req("/api/invitations/accept", undefined, { token, password }),
          ),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 410]);
      professionalId = (
        await db.user.findUniqueOrThrow({
          where: { email: "professional@synthetic.invalid" },
        })
      ).id;
      const profile = await db.roleAssignment.findFirstOrThrow({
        where: { userId: professionalId },
        include: { role: true },
      });
      assert.equal(profile.role.key, "PROFESSIONAL");
      assert.equal(profile.organizationId, unitId);
      await requirePermission({
        userId: professionalId,
        organizationId: unitId,
        permission: PERMISSIONS.PATIENT_READ,
      });
      await assert.rejects(
        requirePermission({
          userId: professionalId,
          organizationId: wrong.id,
          permission: PERMISSIONS.PATIENT_READ,
        }),
      );
      const created2 = await invite(
        req("/api/admin/beta/invitations", responsibleToken, {
          operation: "INVITE",
          organizationId: unitId,
          email: "expire@synthetic.invalid",
          displayName: "Expire Test",
        }),
      );
      const id = (await created2.json()).invitation.id;
      const expired = invitationToken();
      await db.userInvitation.update({
        where: { id },
        data: {
          createdAt: new Date(Date.now() - 7200000),
          expiresAt: new Date(Date.now() - 3600000),
        },
      });
      await assert.rejects(inspectInvitation(expired));
      assert.equal(
        (
          await invite(
            req("/api/admin/beta/invitations", responsibleToken, {
              operation: "REVOKE",
              organizationId: unitId,
              id,
            }),
          )
        ).status,
        201,
      );
      await assert.rejects(inspectInvitation(expired));
      const list = await invitations(
        req(
          `/api/admin/beta/invitations?organizationId=${unitId}`,
          responsibleToken,
        ),
      );
      const data = JSON.stringify(await list.json());
      assert.ok(!data.includes("tokenHash"));
      assert.ok(!data.includes("developmentUrl"));
    },
  );
  await t.test(
    "functional completion emits exactly once without patient payload; low cohort suppressed",
    async () => {
      const patient = await db.patient.create({
        data: {
          fullName: "Synthetic Patient",
          birthDate: new Date("1990-01-01"),
        },
      });
      await db.patientOrganization.create({
        data: { patientId: patient.id, organizationId: unitId },
      });
      const encounter = await createEncounter({
        patientId: patient.id,
        organizationId: unitId,
      });
      await startEncounter(encounter.id);
      await completeEncounter(encounter.id, professionalId);
      await assert.rejects(completeEncounter(encounter.id, professionalId));
      const event = await db.productActivityEvent.findFirstOrThrow({
        where: { eventKey: "encounter.completed" },
      });
      assert.equal(event.actorUserId, professionalId);
      assert.equal(event.resourceId, null);
      assert.ok(!JSON.stringify(event).includes(patient.id));
      const r = await metrics(req("/api/admin/beta/metrics", adminToken));
      assert.equal(r.status, 200);
      const data = await r.json();
      assert.equal(data.adoption.eligibleUnits, 2);
      assert.equal(data.adoption.status, "INSUFFICIENT_SAMPLE");
      assert.equal(data.adoption.activeUnits, null);
      assert.equal(data.dau, null);
      assert.ok(!JSON.stringify(data).includes(patient.id));
      assert.ok(!JSON.stringify(data).includes(professionalId));
      assert.equal(
        (
          await metrics(
            req(
              `/api/admin/beta/metrics?organizationId=${wrong.id}`,
              responsibleToken,
            ),
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await metrics(
            req("/api/admin/beta/metrics?from=2026-02-30", adminToken),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await metrics(
            req("/api/admin/beta/metrics?format=csv&format=csv", adminToken),
          )
        ).status,
        400,
      );
      const csv = await metrics(
        req("/api/admin/beta/metrics?format=csv", adminToken),
      );
      assert.equal(csv.status, 200);
      assert.ok((await csv.text()).includes("SUPPRESSED"));
      assert.equal(csvCell(" =SUM(1,2)"), '"\' =SUM(1,2)"');
    },
  );
  await t.test(
    "rejected requests cannot activate and duplicate CNPJ does not create candidates",
    async () => {
      const rejected = {
        ...publicBody,
        name: "UBS Rejeitada",
        cnes: "7654322",
        cnpj: "12345678000270",
        contactEmail: "reject@synthetic.invalid",
      };
      assert.equal(
        (await submit(req("/api/organization-requests", undefined, rejected)))
          .status,
        202,
      );
      const candidate = await db.organizationCandidate.findFirstOrThrow({
        where: { cnes: rejected.cnes },
      });
      assert.equal(
        (
          await review(
            req("/api/admin/beta/requests", adminToken, {
              id: candidate.id,
              decision: "REJECT",
              reason: "Institution not eligible",
            }),
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await review(
            req("/api/admin/beta/requests", adminToken, {
              id: candidate.id,
              decision: "APPROVE",
              municipalityId: municipality.id,
              reason: "Try activation after rejection",
            }),
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await submit(
            req("/api/organization-requests", undefined, {
              ...publicBody,
              name: "Different name",
              cnes: "7654323",
            }),
          )
        ).status,
        202,
      );
      assert.equal(await db.organizationCandidate.count(), 2);
      assert.equal(
        await db.organization.count({ where: { type: "HEALTH_UNIT" } }),
        2,
      );
    },
  );
  await t.test(
    "PAP admin is denied patient, pregnancy and encounter APIs",
    async () => {
      const patient = await db.patient.findFirstOrThrow();
      for (const path of [
        ["patients"],
        ["patients", patient.id, "pregnancies"],
        ["encounters"],
      ]) {
        const request = req(`/api/clinical/${path.join("/")}`, adminToken);
        request.headers.set("x-organization-id", unitId);
        const r = await clinicalGET(request, {
          params: Promise.resolve({ path }),
        });
        assert.equal(r.status, 403, path.join("/"));
      }
    },
  );
  await t.test(
    "five synthetic functional users produce real aggregate chart, not dashboard views",
    async () => {
      for (let i = 0; i < 5; i++) {
        const unit = await db.organization.create({
          data: {
            type: "HEALTH_UNIT",
            status: "ACTIVE",
            name: `Synthetic Cohort ${i}`,
            parentId: municipality.id,
          },
        });
        const user = await db.user.create({
          data: {
            email: `cohort${i}@synthetic.invalid`,
            displayName: "Synthetic Professional",
          },
        });
        await db.membership.create({
          data: { userId: user.id, organizationId: unit.id, status: "ACTIVE" },
        });
        await assignSystemRole({
          userId: user.id,
          organizationId: unit.id,
          roleKey: "PROFESSIONAL",
        });
        const patient = await db.patient.create({
          data: {
            fullName: "Synthetic Cohort Patient",
            birthDate: new Date("1991-01-01"),
          },
        });
        await db.patientOrganization.create({
          data: { patientId: patient.id, organizationId: unit.id },
        });
        const encounter = await createEncounter({
          patientId: patient.id,
          organizationId: unit.id,
        });
        await startEncounter(encounter.id);
        await completeEncounter(encounter.id, user.id);
      }
      const data = await (
        await metrics(
          req(
            `/api/admin/beta/metrics?organizationId=${municipality.id}`,
            adminToken,
          ),
        )
      ).json();
      assert.equal(data.staff.responsiblesActive, 1);
      assert.equal(data.staff.professionalsActive, 7);
      assert.equal(data.approvedUnits, 1);
      assert.equal(data.adoption.eligibleUnits, 6);
      assert.equal(data.adoption.activeUnits, 6);
      assert.equal(data.adoption.rate, 1);
      assert.equal(data.dau, 6);
      assert.equal(data.daily.at(-1).activeUsers, 6);
      assert.equal(data.retention.status, "INSUFFICIENT_SAMPLE");
    },
  );
  await t.test(
    "user directory paginates and does not disclose foreign tenants",
    async () => {
      const own = await betaUsers(
        req("/api/admin/beta/users?q=responsavel", responsibleToken),
      );
      assert.equal(own.status, 200);
      const body = await own.json();
      assert.equal(body.pageSize, 20);
      assert.equal(body.rows.length, 1);
      assert.equal(body.rows[0].id, responsibleId);
      assert.equal(
        (
          await betaUsers(
            req(
              `/api/admin/beta/users?organizationId=${wrong.id}`,
              responsibleToken,
            ),
          )
        ).status,
        403,
      );
      assert.equal(
        (await betaUsers(req("/api/admin/beta/users?page=-1", adminToken)))
          .status,
        400,
      );
    },
  );
  await t.test(
    "oversized aggregate requests fail explicitly instead of truncating totals",
    async () => {
      await db.productActivityEvent.createMany({
        data: Array.from({ length: 10001 }, () => ({
          organizationId: unitId,
          actorUserId: professionalId,
          eventKey: "encounter.completed",
          metadata: { source: "clinical-api", version: "beta1" },
        })),
      });
      const r = await metrics(req("/api/admin/beta/metrics", adminToken));
      assert.equal(r.status, 400);
      assert.deepEqual(await r.json(), { error: "BETA_QUERY_TOO_LARGE" });
    },
  );
  await t.test(
    "durable abuse limits remain effective concurrently",
    async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          betaRateLimit("test-only", "synthetic", 3),
        ),
      );
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
      assert.equal(results.filter((r) => r.status === "rejected").length, 5);
    },
  );
});
