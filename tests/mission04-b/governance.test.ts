import {
  createProfessionalInvitation,
  acceptInvitation,
} from "../../src/server/invitations/invitation.service";
import { POST as legacyInvite } from "../../src/app/api/admin/invitations/route";
import { createAdminOrganization } from "../../src/server/admin/admin-organizations.service";
import { firstAccessState } from "../../src/server/auth/first-access.service";
import { resolveLoginNavigation } from "../../src/server/auth/login-navigation.service";
import * as OTPAuth from "otpauth";
import { decryptSecret } from "../../src/server/security/secret-encryption";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { getEffectiveAccessProfile } from "../../src/server/iam/effective-access-profile.service";
import { listAccessibleOrganizationIds } from "../../src/server/admin/admin-access.service";
import { validateSession } from "../../src/server/auth/session.service";
import { authenticateLogin } from "../../src/server/auth/login.service";
import { completeMfaLoginWithRecoveryCode } from "../../src/server/auth/mfa-login.service";
import {
  createAdminRoleAssignment,
  revokeAdminRoleAssignment,
} from "../../src/server/admin/admin-roles.service";
import { mutateAdminOrganization } from "../../src/server/admin/admin-organizations.service";
import { reviewBetaRequest } from "../../src/server/admin-beta/requests.service";
import { requireAdminActor } from "../../src/server/admin/admin-session.service";
import { fixture } from "../first-access/fixtures";
import { navigationFingerprint } from "../first-access/login-fixtures";
import { POST as assign } from "../../src/app/api/admin/role-assignments/route";
import { DELETE as revoke } from "../../src/app/api/admin/role-assignments/[assignmentId]/route";
import { GET as roles } from "../../src/app/api/admin/roles/route";
import {
  GET as organizations,
  POST as createOrg,
} from "../../src/app/api/admin/organizations/route";
import { PATCH as lifecycle } from "../../src/app/api/admin/organizations/[organizationId]/route";
import { GET as security } from "../../src/app/api/admin/security/route";
import { GET as metrics } from "../../src/app/api/admin/beta/metrics/route";
import {
  GET as queue,
  POST as review,
} from "../../src/app/api/admin/beta/requests/route";
import { POST as invite } from "../../src/app/api/admin/beta/invitations/route";
import { POST as submit } from "../../src/app/api/organization-requests/route";
import {
  GET as clinicalGet,
  POST as clinicalPost,
  PATCH as clinicalPatch,
} from "../../src/app/api/clinical/[[...path]]/route";
import { actor, publicBody, request } from "./fixtures";
before(async () => {
  assert.equal(
    new URL(process.env.DATABASE_URL!).pathname,
    "/pap_saude_m04_b_test",
  );
  await bootstrapSystemIam();
});
after(() => db.$disconnect());
let admin: Awaited<ReturnType<typeof actor>>,
  manager: Awaited<ReturnType<typeof actor>>,
  commercial: Awaited<ReturnType<typeof actor>>;
let cityId: string, candidateId: string, pendingId: string;
const orgContext = () => ({
  params: Promise.resolve({ organizationId: pendingId }),
});
const orgPath = () => `/api/admin/organizations/${pendingId}`;
test("PAP_ADMIN appoints PAP_MANAGER using real MFA and canonical global scope", async () => {
  admin = await actor();
  manager = await actor();
  commercial = await actor("COMMERCIAL");
  await db.roleAssignment.deleteMany({ where: { userId: manager.user.id } });
  assert.equal(
    (
      await assign(
        request("/api/admin/role-assignments", admin.token, {
          userId: manager.user.id,
          roleKey: "PAP_MANAGER",
        }),
      )
    ).status,
    201,
  );
  const profile = await getEffectiveAccessProfile(manager.user.id);
  assert.equal(profile?.canAccessAdmin, true);
  assert.deepEqual(profile?.permissions, [
    "institution.invite",
    "organization.read",
    "organization.request.review",
    "role.assign_commercial",
  ]);
  assert.equal(
    await db.auditEvent.count({
      where: {
        actorUserId: admin.user.id,
        action: "ROLE_ASSIGNED",
        after: { path: ["roleKey"], equals: "PAP_MANAGER" },
      },
    }),
    1,
  );
});
test("Manager requires MFA for navigation and protected APIs even after completed onboarding", async () => {
  const primary = await firstAccessState(
    manager.user.id,
    manager.session.session.id,
  );
  assert.equal(primary.mfaRequired, true);
  assert.equal(primary.verified, false);
  assert.deepEqual(await resolveLoginNavigation(manager.session.token), {
    view: "REDIRECT",
    destination: "/primeiros-passos",
  });
  assert.equal(
    (await queue(request("/api/admin/beta/requests", manager.session.token)))
      .status,
    403,
  );
  assert.deepEqual(await resolveLoginNavigation(manager.token), {
    view: "REDIRECT",
    destination: "/admin",
  });
});
test("manager cannot grant/revoke Managers/Admins, self-elevate or inject actor/scope", async () => {
  for (const roleKey of [
    "PAP_MANAGER",
    "PAP_ADMIN",
    "PROFESSIONAL",
    "HEALTH_UNIT_ADMIN",
  ]) {
    assert.equal(
      (
        await assign(
          request("/api/admin/role-assignments", manager.token, {
            actorUserId: admin.user.id,
            actorSessionToken: admin.token,
            userId: manager.user.id,
            roleKey,
            ...(["PROFESSIONAL", "HEALTH_UNIT_ADMIN"].includes(roleKey)
              ? { organizationId: manager.unit.id }
              : {}),
          }),
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await assign(
        request("/api/admin/role-assignments", manager.token, {
          userId: manager.user.id,
          roleKey: "COMMERCIAL",
        }),
      )
    ).status,
    403,
  );
  for (const userId of [admin.user.id, manager.user.id]) {
    const assignment = await db.roleAssignment.findFirstOrThrow({
      where: { userId },
    });
    assert.equal(
      (
        await revoke(
          request(
            `/api/admin/role-assignments/${assignment.id}`,
            manager.token,
            undefined,
            "DELETE",
          ),
          { params: Promise.resolve({ assignmentId: assignment.id }) },
        )
      ).status,
      404,
    );
  }
});
test("manager authorizes/revokes eligible Commercial only; privileged targets protected", async () => {
  const target = await db.user.create({
    data: {
      email: `${randomUUID()}@synthetic.invalid`,
      displayName: "Pessoa a autorizar",
    },
  });
  const result = await assign(
    request("/api/admin/role-assignments", manager.token, {
      userId: target.id,
      roleKey: "COMMERCIAL",
    }),
  );
  assert.equal(result.status, 201);
  const assignmentId = (await result.json()).assignment.id;
  const overview = await (
    await roles(request("/api/admin/roles", manager.token))
  ).json();
  assert.equal(overview.delegated, true);
  assert.deepEqual(
    overview.roles.map((r: { key: string }) => r.key),
    ["COMMERCIAL"],
  );
  assert.equal(
    overview.assignableUsers.some(
      (u: { id: string }) => u.id === admin.user.id,
    ),
    false,
  );
  assert.equal(
    (
      await assign(
        request("/api/admin/role-assignments", manager.token, {
          userId: admin.user.id,
          roleKey: "COMMERCIAL",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await revoke(
        request(
          `/api/admin/role-assignments/${assignmentId}`,
          manager.token,
          undefined,
          "DELETE",
        ),
        { params: Promise.resolve({ assignmentId }) },
      )
    ).status,
    200,
  );
  assert.equal(
    (await getEffectiveAccessProfile(target.id))?.permissions.length,
    0,
  );
});
test("persisted grant drift cannot give Manager lifecycle, role.manage or patient privileges", async () => {
  const role = await db.role.findUniqueOrThrow({
    where: { key: "PAP_MANAGER" },
  });
  const permissions = await db.permission.findMany({
    where: {
      key: {
        in: [
          "organization.manage",
          "organization.activate",
          "role.manage",
          "patient.read",
        ],
      },
    },
  });
  await db.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  assert.equal(
    (await getEffectiveAccessProfile(manager.user.id))?.permissions.some((p) =>
      [
        "organization.manage",
        "organization.activate",
        "role.manage",
        "patient.read",
      ].includes(p),
    ),
    false,
  );
  await bootstrapSystemIam();
});
test("manager requests corrections and forwards exactly one pending UBS under concurrency", async () => {
  const body = publicBody();
  assert.equal(
    (await submit(request("/api/organization-requests", undefined, body)))
      .status,
    202,
  );
  candidateId = (
    await db.organizationCandidate.findFirstOrThrow({
      where: { name: body.name },
    })
  ).id;
  cityId = admin.unit.parentId!;
  await db.organization.update({
    where: { id: cityId },
    data: { city: body.city, state: body.state },
  });
  assert.equal(
    (
      await review(
        request("/api/admin/beta/requests", manager.token, {
          id: candidateId,
          decision: "REQUEST_CHANGES",
          reason: "Conferir identificação institucional",
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await db.organizationCandidate.findUniqueOrThrow({
        where: { id: candidateId },
      })
    ).status,
    "CHANGES_REQUESTED",
  );
  assert.equal(await db.organization.count({ where: { name: body.name } }), 0);
  const results = await Promise.all(
    [1, 2].map(() =>
      review(
        request("/api/admin/beta/requests", manager.token, {
          id: candidateId,
          decision: "APPROVE",
          municipalityId: cityId,
          reason: "Análise institucional concluída",
        }),
      ),
    ),
  );
  for (const result of results) assert.equal(result.status, 200);
  const after = await db.organizationCandidate.findUniqueOrThrow({
    where: { id: candidateId },
  });
  pendingId = after.convertedOrganizationId!;
  assert.equal(after.status, "READY_FOR_ACTIVATION");
  const org = await db.organization.findUniqueOrThrow({
    where: { id: pendingId },
  });
  assert.equal(org.status, "PENDING_VERIFICATION");
  assert.equal(org.isActive, false);
  assert.equal(await db.organization.count({ where: { name: body.name } }), 1);
  assert.equal(
    await db.organizationRequest.count({
      where: { candidateId, status: "REQUESTED" },
    }),
    1,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { resourceId: candidateId, action: "REQUEST_FORWARDED" },
    }),
    1,
  );
  assert.equal(
    (
      await invite(
        request("/api/admin/beta/invitations", manager.token, {
          operation: "BOOTSTRAP",
          organizationId: pendingId,
        }),
      )
    ).status,
    400,
  );
});
test("manager cannot activate/suspend/archive via legacy PATCH or alternative payloads", async () => {
  for (const operation of ["ACTIVATE", "SUSPEND", "ARCHIVE", "UPDATE"])
    assert.equal(
      (
        await lifecycle(
          request(
            orgPath(),
            manager.token,
            {
              operation,
              status: "ACTIVE",
              isActive: true,
              actorUserId: admin.user.id,
              confirmationName: "any",
              password: "any",
              code: "000000",
            },
            "PATCH",
          ),
          orgContext(),
        )
      ).status,
      403,
    );
  assert.equal(
    (
      await createOrg(
        request("/api/admin/organizations", manager.token, {
          type: "HEALTH_UNIT",
          name: "Injected",
          parentId: cityId,
          status: "ACTIVE",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await review(
        request("/api/admin/beta/requests", manager.token, {
          id: candidateId,
          decision: "ACTIVATE",
          reason: "Bypass activation",
        }),
      )
    ).status,
    400,
  );
});
test("privileged services bind MFA to exact actor session, not any verified sibling session", async () => {
  await assert.rejects(
    mutateAdminOrganization(
      admin.user.id,
      pendingId,
      { operation: "ACTIVATE" },
      admin.session.token,
    ),
    /ADMIN_MFA_REQUIRED/,
  );
  await assert.rejects(
    reviewBetaRequest(
      admin.user.id,
      {
        id: candidateId,
        decision: "APPROVE",
        reason: "Bypass service MFA",
        municipalityId: cityId,
      },
      admin.session.token,
    ),
    /ADMIN_MFA_REQUIRED/,
  );
  await assert.rejects(
    createAdminRoleAssignment({
      actorUserId: admin.user.id,
      targetUserId: commercial.user.id,
      roleKey: "PAP_MANAGER",
    }),
    /ADMIN_MFA_REQUIRED/,
  );
  await assert.rejects(requireAdminActor(admin.user.id, manager.token));
  await assert.rejects(
    mutateAdminOrganization(
      admin.user.id,
      pendingId,
      { operation: "UPDATE", name: "Injected update" },
      admin.session.token,
    ),
    /ADMIN_MFA_REQUIRED/,
  );
  await assert.rejects(
    createAdminOrganization(
      admin.user.id,
      { type: "HEALTH_UNIT", parentId: cityId, name: "Injected unit" },
      admin.session.token,
    ),
    /ADMIN_MFA_REQUIRED/,
  );
});
test("primary admin session blocked through old organization and role endpoints", async () => {
  assert.equal(
    (
      await lifecycle(
        request(
          orgPath(),
          admin.session.token,
          { operation: "ACTIVATE" },
          "PATCH",
        ),
        orgContext(),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await assign(
        request("/api/admin/role-assignments", admin.session.token, {
          userId: commercial.user.id,
          roleKey: "PAP_MANAGER",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await review(
        request("/api/admin/beta/requests", admin.session.token, {
          id: candidateId,
          decision: "APPROVE",
          reason: "Attempt no MFA",
          municipalityId: cityId,
        }),
      )
    ).status,
    403,
  );
});
test("verified PAP_ADMIN activation atomic and concurrent repeat records one activation", async () => {
  for (const result of await Promise.all(
    [1, 2].map(() =>
      lifecycle(
        request(orgPath(), admin.token, { operation: "ACTIVATE" }, "PATCH"),
        orgContext(),
      ),
    ),
  ))
    assert.equal(result.status, 200);
  const org = await db.organization.findUniqueOrThrow({
    where: { id: pendingId },
  });
  assert.equal(org.status, "ACTIVE");
  assert.equal(org.isActive, true);
  assert.equal(
    (
      await db.organizationCandidate.findUniqueOrThrow({
        where: { id: candidateId },
      })
    ).status,
    "APPROVED",
  );
  assert.equal(
    await db.organizationRequest.count({
      where: { candidateId, status: "RESOLVED" },
    }),
    1,
  );
  for (const [resourceId, action] of [
    [pendingId, "ORGANIZATION_ACTIVATED"],
    [candidateId, "REQUEST_ACTIVATED"],
  ])
    assert.equal(
      await db.auditEvent.count({ where: { resourceId, action } }),
      1,
    );
  assert.equal(
    (
      await invite(
        request("/api/admin/beta/invitations", manager.token, {
          operation: "BOOTSTRAP",
          organizationId: pendingId,
        }),
      )
    ).status,
    201,
  );
});
test("Manager denied other-admin security and metrics; organization list omits clinical counters", async () => {
  assert.equal(
    (await security(request("/api/admin/security", manager.token))).status,
    403,
  );
  assert.equal(
    (await metrics(request("/api/admin/beta/metrics", manager.token))).status,
    403,
  );
  const result = await organizations(
    request("/api/admin/organizations", manager.token),
  );
  assert.equal(result.status, 200);
  for (const org of (await result.json()).organizations) {
    assert.equal("patientLinks" in org._count, false);
    assert.equal("encounters" in org._count, false);
  }
});
test("Commercial denied private organizations, request contacts, roles, security and metrics", async () => {
  for (const [handler, path] of [
    [organizations, "/api/admin/organizations"],
    [queue, "/api/admin/beta/requests"],
    [roles, "/api/admin/roles"],
    [security, "/api/admin/security"],
    [metrics, "/api/admin/beta/metrics"],
  ] as const)
    assert.equal((await handler(request(path, commercial.token))).status, 403);
  assert.equal(
    (await getEffectiveAccessProfile(commercial.user.id))?.canAccessAdmin,
    false,
  );
});
test("Manager organization.read returns only delegated fields across unrelated organizations", async () => {
  await assert.rejects(listAccessibleOrganizationIds(
    manager.user.id,
    "organization.read",
    (await getEffectiveAccessProfile(admin.user.id))!,
  ));
  const marker = `private-organization-${randomUUID()}`;
  const foreign = await actor();
  const city = await db.organization.findUniqueOrThrow({ where: { id: foreign.unit.parentId! } });
  const ids = [foreign.unit.id, city.id, city.parentId!];
  for (const id of ids)
    await db.organization.update({
      where: { id },
      data: {
        settings: { confidential: marker },
        address: marker,
        code: `${marker}-${id}`,
        cnes: `${marker}-${id}`,
        cnpj: `${marker}-${id}`,
      },
    });
  const response = await organizations(request("/api/admin/organizations", manager.token));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes(marker), false);
  for (const id of ids) {
    const row = body.organizations.find((o: { id: string }) => o.id === id);
    assert.ok(row);
    assert.deepEqual(Object.keys(row).sort(), [
      "_count", "city", "id", "isActive", "name", "parent", "parentId", "state", "status", "type",
    ].sort());
    assert.deepEqual(Object.keys(row._count), ["children"]);
    if (row.parent) assert.deepEqual(Object.keys(row.parent).sort(), ["id", "name", "type"]);
    else assert.equal(row.type, "PAP");
  }
  const adminResponse = await organizations(request("/api/admin/organizations", admin.token));
  const adminRows = (await adminResponse.json()).organizations;
  assert.equal(adminRows.find((o: {id: string}) => o.id === ids[0]).address, marker);
  assert.equal(adminRows.some((o: object) => Object.hasOwn(o, "settings")), false);
});
test("Manager organization.read cannot authorize undelegated global resources", async () => {
  for (const path of ["audit", "beta/users", "security", "beta/metrics", "operations/metrics", "operations/monitoring", "operations/integrations"]) {
    const handler = await import(`../../src/app/api/admin/${path}/route`);
    assert.equal((await handler.GET(request(`/api/admin/${path}`, manager.token))).status, 403, path);
  }
  const handler = await import("../../src/app/api/admin/users/route");
  const response = await handler.GET(request("/api/admin/users", manager.token));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).users, []);
});
test("global nonclinical roles denied clinical GET/POST/PATCH with forged org and demo query", async () => {
  for (const person of [admin, manager, commercial])
    for (const [handler, method, path, body] of [
      [clinicalGet, "GET", ["patients"], undefined],
      [clinicalPost, "POST", ["patients"], { fullName: "Synthetic" }],
      [
        clinicalPatch,
        "PATCH",
        ["patients", randomUUID()],
        { fullName: "Synthetic" },
      ],
    ] as const) {
      const response = await handler(
        request(
          `/api/clinical/${path.join("/")}?mode=demo&organizationId=${pendingId}`,
          person.token,
          body,
          method,
          { "x-organization-id": pendingId },
        ),
        { params: Promise.resolve({ path: [...path] }) },
      );
      assert.equal(response.status, 403);
    }
});
test("Professional optional MFA retained: own-unit clinical access, foreign-unit denied", async () => {
  const f = await fixture("PROFESSIONAL");
  const context = { params: Promise.resolve({ path: ["patients"] }) };
  for (const [id, status] of [
    [f.unit.id, 200],
    [pendingId, 403],
  ] as const)
    assert.equal(
      (
        await clinicalGet(
          request("/api/clinical/patients", f.session.token, undefined, "GET", {
            "x-organization-id": id,
          }),
          context,
        )
      ).status,
      status,
    );
  await assert.rejects(
    mutateAdminOrganization(
      f.user.id,
      pendingId,
      { operation: "ACTIVATE" },
      f.session.token,
    ),
  );
});
test("anonymous and unassigned accounts cannot read or self-promote through admin API", async () => {
  assert.equal(
    (await organizations(request("/api/admin/organizations"))).status,
    401,
  );
  const f = await actor();
  await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
  assert.equal(
    (await organizations(request("/api/admin/organizations", f.token))).status,
    403,
  );
  assert.equal(
    (
      await assign(
        request("/api/admin/role-assignments", f.token, {
          userId: f.user.id,
          roleKey: "PAP_ADMIN",
        }),
      )
    ).status,
    403,
  );
});
test("CSRF rejects foreign origin; expired/revoked verified sessions cannot activate", async () => {
  assert.equal(
    (
      await lifecycle(
        request(orgPath(), admin.token, { operation: "SUSPEND" }, "PATCH", {
          origin: "https://foreign.invalid",
        }),
        orgContext(),
      )
    ).status,
    403,
  );
  const f = await actor();
  await db.session.update({
    where: { id: f.verified.session.id },
    data: {
      createdAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  assert.equal(
    (
      await lifecycle(
        request(orgPath(), f.token, { operation: "SUSPEND" }, "PATCH"),
        orgContext(),
      )
    ).status,
    401,
  );
  await db.session.update({
    where: { id: f.verified.session.id },
    data: {
      expiresAt: new Date(Date.now() + 60000),
      revokedAt: new Date(),
      revocationReason: "ADMIN_REVOKED",
    },
  });
  assert.equal(
    (
      await lifecycle(
        request(orgPath(), f.token, { operation: "SUSPEND" }, "PATCH"),
        orgContext(),
      )
    ).status,
    401,
  );
});
test("old PATCH archival requires exact name, password and fresh TOTP", async () => {
  assert.equal(
    (
      await lifecycle(
        request(orgPath(), admin.token, { operation: "ARCHIVE" }, "PATCH"),
        orgContext(),
      )
    ).status,
    403,
  );
  assert.equal(
    (await db.organization.findUniqueOrThrow({ where: { id: pendingId } }))
      .status,
    "ACTIVE",
  );
});
test("Admin lifecycle audited and preserves existing password, sessions and MFA", async () => {
  const before = await navigationFingerprint(admin.user.id);
  for (const operation of ["SUSPEND", "ACTIVATE"] as const)
    assert.equal(
      (
        await lifecycle(
          request(orgPath(), admin.token, { operation }, "PATCH"),
          orgContext(),
        )
      ).status,
      200,
    );
  assert.equal(before === (await navigationFingerprint(admin.user.id)), true);
});
test("institutional invitations cannot self-elevate Manager through Beta or legacy route", async () => {
  for (const [handler, path, body] of [
    [
      invite,
      "/api/admin/beta/invitations",
      {
        operation: "INVITE",
        email: manager.user.email,
        displayName: "Self elevation",
        organizationId: pendingId,
      },
    ],
    [
      legacyInvite,
      "/api/admin/invitations",
      {
        email: manager.user.email,
        displayName: "Self elevation",
        organizationId: pendingId,
      },
    ],
  ] as const)
    assert.equal(
      (await handler(request(path, manager.token, body))).status,
      403,
    );
  assert.equal(
    await db.userInvitation.count({ where: { email: manager.user.email } }),
    0,
  );
  assert.equal(
    await db.membership.count({ where: { userId: manager.user.id } }),
    0,
  );
  for (const target of [admin, commercial])
    assert.equal(
      (
        await invite(
          request("/api/admin/beta/invitations", manager.token, {
            operation: "INVITE",
            email: target.user.email,
            displayName: "Protected target",
            organizationId: pendingId,
          }),
        )
      ).status,
      403,
    );
});

test("Manager may invite a new professional but cannot bootstrap own institutional contact", async () => {
  assert.equal(
    (
      await invite(
        request("/api/admin/beta/invitations", manager.token, {
          operation: "INVITE",
          email: `${randomUUID()}@synthetic.invalid`,
          displayName: "Professional delegated",
          organizationId: pendingId,
        }),
      )
    ).status,
    201,
  );
  const candidate = await db.organizationCandidate.findUniqueOrThrow({
    where: { id: candidateId },
  });
  await db.organizationCandidate.update({
    where: { id: candidateId },
    data: { contactEmail: manager.user.email },
  });
  assert.equal(
    (
      await invite(
        request("/api/admin/beta/invitations", manager.token, {
          operation: "BOOTSTRAP",
          organizationId: pendingId,
        }),
      )
    ).status,
    403,
  );
  await db.organizationCandidate.update({
    where: { id: candidateId },
    data: { contactEmail: candidate.contactEmail },
  });
});

test("pending invitation cannot grant clinical access after target is appointed Manager", async () => {
  const email = `${randomUUID()}@synthetic.invalid`;
  const invitation = await createProfessionalInvitation({
    invitedByUserId: manager.user.id,
    organizationId: pendingId,
    email,
    displayName: "Pending delegated target",
  });
  if (!invitation.developmentUrl)
    throw new Error("Synthetic development URL required");
  const target = await db.user.findUniqueOrThrow({ where: { email } });
  await createAdminRoleAssignment({
    actorUserId: admin.user.id,
    actorSessionToken: admin.token,
    targetUserId: target.id,
    roleKey: "PAP_MANAGER",
  });
  await assert.rejects(
    acceptInvitation({
      token: new URL(invitation.developmentUrl).searchParams.get("token")!,
      password: "Synthetic-only!Password2026",
    }),
  );
  assert.equal(
    await db.roleAssignment.count({
      where: { userId: target.id, role: { key: "PROFESSIONAL" } },
    }),
    0,
  );
  assert.equal(
    (
      await db.userInvitation.findUniqueOrThrow({
        where: { id: invitation.invitation.id },
      })
    ).status,
    "PENDING",
  );
  assert.equal(
    await db.passwordCredential.count({ where: { userId: target.id } }),
    0,
  );
});

test("PAP_ADMIN revocation of Manager immediately affects the same verified session", async () => {
  const assignment = await db.roleAssignment.findFirstOrThrow({
    where: { userId: manager.user.id, role: { key: "PAP_MANAGER" } },
  });
  await revokeAdminRoleAssignment({
    actorUserId: admin.user.id,
    actorSessionToken: admin.token,
    assignmentId: assignment.id,
  });
  assert.equal(
    (await queue(request("/api/admin/beta/requests", manager.token))).status,
    403,
  );
  assert.equal(
    (
      await assign(
        request("/api/admin/role-assignments", manager.token, {
          userId: commercial.user.id,
          roleKey: "COMMERCIAL",
        }),
      )
    ).status,
    403,
  );
  assert.equal((await validateSession(manager.token)).user.id, manager.user.id);
});
test("normal login still accepts existing password and recovery factor without identity reset", async () => {
  const login = await authenticateLogin({
    email: admin.user.email,
    password: admin.password,
    origin: "m04-preservation",
  });
  assert.equal(login.status, "MFA_REQUIRED");
  if (login.status !== "MFA_REQUIRED") throw new Error("Expected challenge");
  const verified = await completeMfaLoginWithRecoveryCode({
    challengeToken: login.challengeToken,
    recoveryCode: admin.codes[1],
  });
  assert.equal(
    (await requireAdminActor(admin.user.id, verified.sessionToken)).user.id,
    admin.user.id,
  );
});

test("strong archival succeeds without deleting clinical history and rejects code replay", async () => {
  const f = await actor();
  const patient = await db.patient.create({
    data: {
      fullName: "Paciente sintética preservada",
      birthDate: new Date("1990-01-01"),
      organizations: { create: { organizationId: f.unit.id } },
    },
  });
  const factor = await db.mfaFactor.findFirstOrThrow({
    where: { userId: f.user.id, status: "ACTIVE" },
  });
  const code = new OTPAuth.TOTP({
    secret: decryptSecret(factor.secretEncrypted),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  }).generate();
  const data = {
    operation: "ARCHIVE",
    confirmationName: f.unit.name,
    password: f.password,
    code,
  };
  const context = { params: Promise.resolve({ organizationId: f.unit.id }) };
  assert.equal(
    (
      await lifecycle(
        request(
          `/api/admin/organizations/${f.unit.id}`,
          f.token,
          { ...data, password: "Invalid-password!2026" },
          "PATCH",
        ),
        context,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await lifecycle(
        request(
          `/api/admin/organizations/${f.unit.id}`,
          f.token,
          data,
          "PATCH",
        ),
        context,
      )
    ).status,
    200,
  );
  assert.equal(
    (await db.organization.findUniqueOrThrow({ where: { id: f.unit.id } }))
      .status,
    "ARCHIVED",
  );
  assert.equal(
    await db.patientOrganization.count({
      where: { patientId: patient.id, organizationId: f.unit.id },
    }),
    1,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { resourceId: f.unit.id, action: "ORGANIZATION_ARCHIVED" },
    }),
    1,
  );
  assert.equal(
    (
      await lifecycle(
        request(
          `/api/admin/organizations/${f.unit.id}`,
          f.token,
          data,
          "PATCH",
        ),
        context,
      )
    ).status,
    403,
  );
});

test("revoked delegated inviter cannot authorize acceptance of an outstanding institutional invitation", async () => {
  const inviter = await actor("PAP_MANAGER");
  const created = await createProfessionalInvitation({
    invitedByUserId: inviter.user.id,
    organizationId: pendingId,
    email: `${randomUUID()}@synthetic.invalid`,
    displayName: "Pending after revocation",
  });
  if (!created.developmentUrl)
    throw new Error("Synthetic development URL required");
  const assignment = await db.roleAssignment.findFirstOrThrow({
    where: { userId: inviter.user.id, role: { key: "PAP_MANAGER" } },
  });
  await revokeAdminRoleAssignment({
    actorUserId: admin.user.id,
    actorSessionToken: admin.token,
    assignmentId: assignment.id,
  });
  await assert.rejects(
    acceptInvitation({
      token: new URL(created.developmentUrl).searchParams.get("token")!,
      password: "Synthetic-only!Password2026",
    }),
  );
  assert.equal(
    (
      await db.userInvitation.findUniqueOrThrow({
        where: { id: created.invitation.id },
      })
    ).status,
    "PENDING",
  );
});
