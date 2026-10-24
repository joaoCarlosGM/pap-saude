import * as OTPAuth from "otpauth";
import { authenticateLogin } from "../../src/server/auth/login.service";
import { completeMfaLoginWithRecoveryCode } from "../../src/server/auth/mfa-login.service";
import { mutateAdminOrganization } from "../../src/server/admin/admin-organizations.service";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../../src/server/db/client";
import { provisionFirstAdmin } from "../../scripts/local/provision";
import { verifyPassword } from "../../src/server/auth/password";
import { createSession } from "../../src/server/auth/session.service";
import { NextRequest } from "next/server";
import { GET as organizations } from "../../src/app/api/admin/organizations/route";
import { POST as security } from "../../src/app/api/auth/security/route";
import { captureLocalDemoMail } from "../../src/server/email/local-demo-mail";
import { sendInvitationEmail } from "../../src/server/email/email.service";
import {
  submitPublicRequest,
  reviewBetaRequest,
} from "../../src/server/admin-beta/requests.service";
import {
  createHealthUnitAdminInvitation,
  acceptInvitation,
  createProfessionalInvitation,
} from "../../src/server/invitations/invitation.service";
let externalCalls = 0;
const fetchOriginal = global.fetch;
global.fetch = async () => {
  externalCalls++;
  throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_LOCAL_DEMO");
};
after(async () => {
  global.fetch = fetchOriginal;
  await db.$disconnect();
});
test("operator-selected admin has hashed password, global role and real enrollment; demo invitations are captured without network", async () => {
  const password = randomBytes(24).toString("base64url"),
    email = `${randomBytes(8).toString("hex")}@synthetic.invalid`;
  await provisionFirstAdmin({
    email,
    displayName: "Synthetic Operator Input",
    password,
  });
  const admin = await db.user.findUniqueOrThrow({
    where: { email },
    include: {
      passwordCredential: true,
      roleAssignments: { include: { role: true } },
    },
  });
  assert.equal(
    await verifyPassword(admin.passwordCredential!.passwordHash, password),
    true,
  );
  assert.notEqual(admin.passwordCredential!.passwordHash, password);
  assert.equal(admin.roleAssignments[0].role.key, "PAP_ADMIN");
  assert.equal(admin.roleAssignments[0].organizationId, null);
  assert.equal(await db.mfaFactor.count(), 0);
  assert.equal(await db.membership.count(), 0);
  const originalHash = admin.passwordCredential!.passwordHash;
  await assert.rejects(
    provisionFirstAdmin({
      email,
      displayName: "Overwrite Attempt",
      password: randomBytes(24).toString("base64url"),
    }),
  );
  assert.equal(
    (
      await db.passwordCredential.findUniqueOrThrow({
        where: { userId: admin.id },
      })
    ).passwordHash,
    originalHash,
  );
  const session = await createSession({ userId: admin.id });
  const headers = {
    origin: "http://127.0.0.1:3100",
    cookie: `pap_session=${session.token}`,
    "Content-Type": "application/json",
  };
  assert.equal(
    (
      await organizations(
        new NextRequest("http://127.0.0.1:3100/api/admin/organizations", {
          headers,
        }),
      )
    ).status,
    403,
  );
  const enrolled = await security(
    new NextRequest("http://127.0.0.1:3100/api/auth/security", {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "START_MFA", password }),
    }),
  );
  assert.equal(enrolled.status, 200);
  const enrollment = await enrolled.json();
  assert.ok(enrollment.secret);
  assert.match(enrollment.provisioningUri, /^otpauth:\/\//);
  const confirmation = await security(
    new NextRequest("http://127.0.0.1:3100/api/auth/security", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "CONFIRM_MFA",
        password,
        factorId: enrollment.factorId,
        code: OTPAuth.URI.parse(enrollment.provisioningUri).generate(),
      }),
    }),
  );
  assert.equal(confirmation.status, 200);
  const recovery = await confirmation.json();
  const login = await authenticateLogin({
    email,
    password,
    origin: "synthetic-local-smoke",
  });
  assert.equal(login.status, "MFA_REQUIRED");
  if (login.status !== "MFA_REQUIRED")
    throw new Error("Expected MFA challenge");
  const verified = await completeMfaLoginWithRecoveryCode({
    challengeToken: login.challengeToken,
    recoveryCode: recovery.codes[0],
  });
  const pap = await db.organization.findFirstOrThrow({
    where: { type: "PAP" },
  });
  const municipality = await db.organization.create({
    data: {
      type: "MUNICIPALITY",
      name: "Synthetic Municipality",
      city: "Cidade Teste",
      state: "CE",
      parentId: pap.id,
      status: "ACTIVE",
    },
  });
  await submitPublicRequest({
    name: "Synthetic UBS",
    city: "Cidade Teste",
    state: "CE",
    address: "Rua Sintética 100",
    contactName: "Synthetic Responsible",
    contactEmail: "responsible@synthetic.invalid",
    contactPhone: "85999999999",
    consent: true,
  });
  const candidate = await db.organizationCandidate.findFirstOrThrow();
  const approved = await reviewBetaRequest(
    admin.id,
    {
      id: candidate.id,
      decision: "APPROVE",
      municipalityId: municipality.id,
      reason: "Synthetic local validation",
    },
    verified.sessionToken,
  );
  assert.equal(approved.status, "READY_FOR_ACTIVATION");
  const pending = await db.organization.findUniqueOrThrow({
    where: { id: approved.organizationId! },
  });
  assert.equal(pending.status, "PENDING_VERIFICATION");
  assert.equal(pending.isActive, false);
  await mutateAdminOrganization(
    admin.id,
    approved.organizationId!,
    { operation: "ACTIVATE" },
    verified.sessionToken,
  );
  const invitation = await createHealthUnitAdminInvitation({
    invitedByUserId: admin.id,
    organizationId: approved.organizationId!,
    email: candidate.contactEmail!,
    displayName: candidate.contactName!,
  });
  assert.equal(invitation.delivery.mode, "DEVELOPMENT");
  assert.ok(invitation.developmentUrl);
  const activated = await acceptInvitation({
    token: new URL(invitation.developmentUrl!).searchParams.get("token")!,
    password,
  });
  assert.equal(activated.roleKey, "HEALTH_UNIT_ADMIN");
  const professional = await createProfessionalInvitation({
    invitedByUserId: activated.userId,
    organizationId: approved.organizationId!,
    email: "professional@synthetic.invalid",
    displayName: "Synthetic Professional",
  });
  const accepted = await acceptInvitation({
    token: new URL(professional.developmentUrl!).searchParams.get("token")!,
    password,
  });
  assert.equal(accepted.roleKey, "PROFESSIONAL");
  assert.equal(accepted.organizationId, approved.organizationId);
  const dir = resolve(process.cwd(), ".local/pap-admin/mail"),
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 2);
  const mail = JSON.parse(await readFile(resolve(dir, files[0]), "utf8"));
  assert.ok(mail.html.includes("#064f50"));
  const link = new URL(mail.html.match(/href="([^"]+)"/)![1].replaceAll("&amp;", "&"));
  assert.equal(link.origin, "http://127.0.0.1:3100");
  assert.equal(link.pathname, "/convite");
  // Bearers belong in fragments, never HTTP request/analytics query strings.
  // Boolean assertions avoid printing a bearer if this regresses in the future.
  assert.ok(link.search === "", "invitation query must not contain secrets");
  assert.ok(/^[A-Za-z0-9_-]{43}$/.test(new URLSearchParams(link.hash.slice(1)).get("token") || ""));
  assert.ok(mail.text.includes("/convite#token=") && mail.text.includes(link.toString()));
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  await assert.rejects(
    captureLocalDemoMail({
      to: email,
      subject: "Synthetic",
      text: "Synthetic",
      html: "<p>Synthetic</p>",
    }),
  );
  try {
    await assert.rejects(
      sendInvitationEmail({
        to: email,
        displayName: "Synthetic",
        organizationName: "Synthetic UBS",
        invitationUrl: "http://127.0.0.1:3100/convite?token=fake",
      }),
    );
  } finally {
    Object.assign(process.env, { NODE_ENV: previous });
  }
  process.env.PAP_LOCAL_DEMO = "0";
  try {
    await assert.rejects(
      sendInvitationEmail({
        to: email,
        displayName: "Synthetic",
        organizationName: "Synthetic UBS",
        invitationUrl: "http://127.0.0.1:3100/convite?token=fake",
      }),
    );
  } finally {
    process.env.PAP_LOCAL_DEMO = "1";
  }
  assert.equal(externalCalls, 0);
  assert.equal(
    (await readdir(dir)).filter((f) => f.endsWith(".json")).length,
    2,
  );
});
