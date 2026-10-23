import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import * as OTPAuth from "otpauth";

test("forward-only upgrade of populated Beta preserves identities/password/TOTP/sessions/memberships/approved UBS/invites; bootstrap idempotent", async () => {
  assert.equal(
    new URL(process.env.DATABASE_URL!).pathname,
    "/pap_saude_m04_b_test",
  );
  assert.equal(
    execFileSync(
      "docker",
      [
        "inspect",
        "-f",
        '{{index .Config.Labels "pap.disposable"}}',
        "pap_saude_db",
      ],
      { encoding: "utf8" },
    ).trim(),
    "f0410",
  );
  const name = `pap_m04_b_upgrade_${process.pid}`;
  const admin = new pg.Client({
    connectionString:
      "postgresql://pap_user:pap_password@127.0.0.1:5432/postgres",
  });
  await admin.connect();
  const connectionString = `postgresql://pap_user:pap_password@127.0.0.1:5432/${name}`;
  const client = new pg.Client({ connectionString });
  let disconnect: (() => Promise<void>) | undefined;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    await client.connect();
    const migration = "20261022040000_mission04_delegated_governance";
    for (const directory of readdirSync("prisma/migrations")
      .filter((d) => d < migration && d !== "migration_lock.toml")
      .sort())
      await client.query(
        readFileSync(`prisma/migrations/${directory}/migration.sql`, "utf8"),
      );
    process.env.DATABASE_URL = connectionString;
    const { db } = await import("../../src/server/db/client");
    disconnect = () => db.$disconnect();
    const { SYSTEM_ROLES } = await import(
      "../../src/server/iam/system-role-catalog"
    );
    const { ALL_PERMISSION_KEYS } = await import(
      "../../src/server/iam/permissions"
    );
    const added = new Set([
      "organization.activate",
      "organization.deactivate",
      "organization.delete",
      "organization.request.review",
      "institution.invite",
      "role.assign_commercial",
    ]);
    for (const key of ALL_PERMISSION_KEYS.filter((k) => !added.has(k)))
      await db.permission.create({ data: { key } });
    for (const definition of SYSTEM_ROLES.filter(
      (r) => r.key !== "PAP_MANAGER",
    )) {
      const role = await db.role.create({
        data: { key: definition.key, name: definition.name, system: true },
      });
      const keys = [
        ...definition.permissions.filter((k) => !added.has(k)),
        ...(definition.key === "COMMERCIAL" ? ["organization.read"] : []),
      ];
      const permissions = await db.permission.findMany({
        where: { key: { in: keys } },
      });
      await db.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
    const { verifiedLoginFixture, navigationFingerprint } = await import(
      "../first-access/login-fixtures"
    );
    const { fixture } = await import("../first-access/fixtures");
    const f = await verifiedLoginFixture();
    const professional = await fixture("PROFESSIONAL");
    const candidate = await db.organizationCandidate.create({
      data: {
        type: "HEALTH_UNIT",
        name: "UBS legada aprovada",
        normalizedName: "ubs legada aprovada",
        dedupeKey: randomUUID(),
        status: "APPROVED",
        convertedOrganizationId: f.unit.id,
        consentedAt: new Date(),
        contactEmail: `${randomUUID()}@synthetic.invalid`,
      },
    });
    await db.organizationRequest.create({
      data: { candidateId: candidate.id, status: "RESOLVED" },
    });
    // Construct pre-upgrade data without invoking post-C application guards:
    // the legacy schema deliberately has no access_invitations table yet.
    const legacyUser = await db.user.create({ data: { email: `${randomUUID()}@synthetic.invalid`, displayName: "Convite legado" } });
    await db.membership.create({ data: { userId: legacyUser.id, organizationId: f.unit.id, status: "INVITED" } });
    await db.userInvitation.create({ data: { invitedByUserId: f.user.id, userId: legacyUser.id, organizationId: f.unit.id,
      email: legacyUser.email, displayName: legacyUser.displayName, roleKey: "PROFESSIONAL", tokenHash: createHash("sha256").update(randomUUID()).digest("hex"), expiresAt: new Date(Date.now() + 86400000), deliveryStatus: "DEVELOPMENT" } });
    const beforeAdmin = await navigationFingerprint(f.user.id),
      beforeProfessional = await navigationFingerprint(professional.user.id);
    const snapshot = async () =>
      JSON.stringify(
        await Promise.all([
          db.organization.findMany({ orderBy: { id: "asc" } }),
          db.organizationCandidate.findMany({ orderBy: { id: "asc" } }),
          db.organizationRequest.findMany({ orderBy: { id: "asc" } }),
          db.userInvitation.findMany({ orderBy: { id: "asc" } }),
        ]),
      );
    const before = await snapshot();
    const sql = readFileSync(
      `prisma/migrations/${migration}/migration.sql`,
      "utf8",
    );
    await client.query(sql);
    await client.query(sql);
    const { bootstrapSystemIam } = await import(
      "../../src/server/iam/bootstrap.service"
    );
    await bootstrapSystemIam();
    await bootstrapSystemIam();
    assert.equal(
      beforeAdmin === (await navigationFingerprint(f.user.id)),
      true,
    );
    assert.equal(
      beforeProfessional ===
        (await navigationFingerprint(professional.user.id)),
      true,
    );
    assert.equal(before === (await snapshot()), true);
    assert.equal(await db.role.count({ where: { key: "PAP_MANAGER" } }), 1);
    assert.equal(
      await db.roleAssignment.count({
        where: { role: { key: "PAP_MANAGER" } },
      }),
      0,
    );
    assert.equal(
      await db.rolePermission.count({
        where: {
          role: { key: "COMMERCIAL" },
          permission: { key: "organization.read" },
        },
      }),
      0,
    );
    const { requireAdminActor } = await import(
      "../../src/server/admin/admin-session.service"
    );
    assert.equal(
      (await requireAdminActor(f.user.id, f.verified.sessionToken)).user.id,
      f.user.id,
    );
    const { authenticateLogin } = await import(
      "../../src/server/auth/login.service"
    );
    const { completeMfaLogin } = await import(
      "../../src/server/auth/mfa-login.service"
    );
    const { decryptSecret } = await import(
      "../../src/server/security/secret-encryption"
    );
    const factor = await db.mfaFactor.findFirstOrThrow({
      where: { userId: f.user.id, status: "ACTIVE" },
    });
    const login = await authenticateLogin({
      email: f.user.email,
      password: f.password,
      origin: "legacy-upgrade-test",
    });
    assert.equal(login.status, "MFA_REQUIRED");
    if (login.status !== "MFA_REQUIRED")
      throw new Error("Expected MFA challenge");
    const code = new OTPAuth.TOTP({
      secret: decryptSecret(factor.secretEncrypted),
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    }).generate();
    const verified = await completeMfaLogin({
      challengeToken: login.challengeToken,
      code,
    });
    assert.equal(
      (await requireAdminActor(f.user.id, verified.sessionToken)).user.id,
      f.user.id,
    );
  } finally {
    await disconnect?.();
    await client.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
});
