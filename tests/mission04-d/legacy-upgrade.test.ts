import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import * as OTPAuth from "otpauth";

test("C-to-D forward upgrade preserves exact legacy/C rows, restored backup, passwords, TOTP and live sessions", async () => {
  assert.equal(
    new URL(process.env.DATABASE_URL!).pathname,
    "/pap_saude_m04_d_test",
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
  const name = `pap_m04_d_upgrade_${process.pid}`,
    restoredName = `pap_m04_d_restore_${process.pid}`;
  const admin = new pg.Client({
    connectionString:
      "postgresql://pap_user:pap_password@127.0.0.1:5432/postgres",
  });
  await admin.connect();
  mkdirSync(".test-audit", { recursive: true });
  const dir = mkdtempSync(resolve(".test-audit/d-upgrade-")),
    migrations = join(dir, "migrations"),
    config = join(dir, "prisma.config.ts");
  mkdirSync(migrations);
  const migration = "20261023060000_mission04_transactional_email";
  for (const d of readdirSync("prisma/migrations").filter(
    (d) => d < migration || d === "migration_lock.toml",
  ))
    cpSync(join("prisma/migrations", d), join(migrations, d), {
      recursive: true,
    });
  writeFileSync(
    config,
    `import { defineConfig } from "prisma/config"; export default defineConfig({schema:${JSON.stringify(resolve("prisma/schema.prisma"))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.DATABASE_URL!}});`,
  );
  const url = `postgresql://pap_user:pap_password@127.0.0.1:5432/${name}?schema=public`;
  const migrate = (databaseUrl: string) =>
    execFileSync(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--config",
        config,
      ],
      { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "pipe" },
    );
  const client = new pg.Client({ connectionString: url });
  let created = false,
    restored = false,
    disconnect: (() => Promise<void>) | undefined;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    created = true;
    migrate(url);
    await client.connect();
    process.env.DATABASE_URL = url;
    const { db } = await import("../../src/server/db/client");
    disconnect = () => db.$disconnect();
    const { bootstrapSystemIam } =
      await import("../../src/server/iam/bootstrap.service");
    await bootstrapSystemIam();
    const { verifiedLoginFixture, navigationFingerprint } =
      await import("../first-access/login-fixtures");
    const { fixture } = await import("../first-access/fixtures");
    const f = await verifiedLoginFixture(),
      professional = await fixture("PROFESSIONAL");
    const legacy = await db.user.create({
      data: {
        email: `${randomUUID()}@synthetic.invalid`,
        displayName: "Convite institucional legado",
      },
    });
    await db.membership.create({
      data: { userId: legacy.id, organizationId: f.unit.id, status: "INVITED" },
    });
    const legacyToken = randomBytes(32).toString("base64url");
    await db.userInvitation.create({
      data: {
        email: legacy.email,
        displayName: legacy.displayName,
        userId: legacy.id,
        organizationId: f.unit.id,
        invitedByUserId: f.user.id,
        roleKey: "PROFESSIONAL",
        tokenHash: createHash("sha256")
          .update("pap-saude:user-invitation:v1\0")
          .update(legacyToken)
          .digest("hex"),
        expiresAt: new Date(Date.now() + 86400000),
        deliveryStatus: "DEVELOPMENT",
      },
    });
    // A genuinely authorized C row and its in-app notification also survive D.
    const existingAssignment = await db.roleAssignment.findFirstOrThrow({ where: { userId: professional.user.id, organizationId: professional.unit.id } });
    const accepted = await db.accessInvitation.create({ data: {
      email: professional.user.email, displayName: professional.user.displayName,
      proposedRoleKey: "PROFESSIONAL", status: "ACTIVE", activeSlot: 1,
      tokenHash: null, expiresAt: new Date(Date.now()+86400000),
      acceptedAt: new Date(), decidedAt: new Date(), userId: professional.user.id,
      invitedByUserId: f.user.id, reviewedByUserId: f.user.id,
      assignmentId: existingAssignment.id, deliveryStatus: "CAPTURED",
    } });
    await db.userNotification.create({ data: { userId: professional.user.id,
      invitationId: accepted.id, kind: "ACCESS_APPROVED", dedupeKey: `access/${accepted.id}/ACCESS_APPROVED`, emailStatus: "CAPTURED" } });
    const tables = [
      "users",
      "password_credentials",
      "mfa_factors",
      "mfa_recovery_codes",
      "mfa_challenges",
      "sessions",
      "memberships",
      "role_assignments",
      "organizations",
      "user_onboarding_progress",
      "user_invitations",
      "audit_events",
      "access_invitations",
      "user_notifications",
    ];
    const snapshot = async (c: pg.Client) =>
      JSON.stringify(
        await Promise.all(
          tables.map(
            async (table) =>
              (
                await c.query(
                  `SELECT json_agg(row_to_json(t) ORDER BY id) AS rows FROM ${table} t`,
                )
              ).rows[0].rows,
          ),
        ),
      );
    const before = await snapshot(client),
      fingerprint = await navigationFingerprint(f.user.id),
      professionalBefore = await navigationFingerprint(professional.user.id);
    // Binary synthetic backup stays in process memory; no raw fixture DB is logged or committed.
    const backup = execFileSync("docker", [
      "exec",
      "pap_saude_db",
      "pg_dump",
      "-U",
      "pap_user",
      "-d",
      name,
      "-Fc",
    ]);
    await admin.query(`CREATE DATABASE ${restoredName}`);
    restored = true;
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "pap_saude_db",
        "pg_restore",
        "-U",
        "pap_user",
        "-d",
        restoredName,
        "--exit-on-error",
      ],
      { input: backup, stdio: ["pipe", "pipe", "pipe"] },
    );
    const restoreClient = new pg.Client({
      connectionString: url.replace(name, restoredName),
    });
    await restoreClient.connect();
    try {
      assert.ok(
        before === (await snapshot(restoreClient)),
        "backup restore preserves exact synthetic legacy rows",
      );
      cpSync(
        join("prisma/migrations", migration),
        join(migrations, migration),
        { recursive: true },
      );
      migrate(url);
      migrate(url);
      migrate(url.replace(name, restoredName));
      migrate(url.replace(name, restoredName));
      await bootstrapSystemIam();
      await bootstrapSystemIam();
      assert.ok(
        before === (await snapshot(client)),
        "forward upgrade preserves every old table snapshot",
      );
      assert.ok(
        before === (await snapshot(restoreClient)),
        "restored legacy database can roll forward with unchanged old rows",
      );
      assert.ok(fingerprint === (await navigationFingerprint(f.user.id)));
      assert.ok(
        professionalBefore ===
          (await navigationFingerprint(professional.user.id)),
      );
      assert.equal(await db.accessInvitation.count(), 1);
      assert.equal(await db.transactionalEmail.count(), 0);
      assert.equal(await db.organizationActivationNotice.count(), 0);
      assert.equal(await db.userNotification.count(), 1);
      assert.equal(
        Number(
          (
            await client.query(
              "SELECT count(*) FROM _prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL",
              [migration],
            )
          ).rows[0].count,
        ),
        1,
      );
      const { requireAdminActor } =
        await import("../../src/server/admin/admin-session.service");
      assert.equal(
        (await requireAdminActor(f.user.id, f.verified.sessionToken)).user.id,
        f.user.id,
      );
      const factor = await db.mfaFactor.findFirstOrThrow({
        where: { userId: f.user.id, status: "ACTIVE" },
      });
      // Respect anti-replay rather than weakening its time-step checks for a test.
      if (
        factor.lastUsedAt &&
        Math.floor(factor.lastUsedAt.getTime() / 30000) >=
          Math.floor(Date.now() / 30000)
      )
        await new Promise((r) => setTimeout(r, 30050 - (Date.now() % 30000)));
      const { authenticateLogin } =
        await import("../../src/server/auth/login.service");
      const { completeMfaLogin } =
        await import("../../src/server/auth/mfa-login.service");
      const { decryptSecret } =
        await import("../../src/server/security/secret-encryption");
      const login = await authenticateLogin({
        email: f.user.email,
        password: f.password,
        origin: "c-legacy-upgrade",
      });
      assert.equal(login.status, "MFA_REQUIRED");
      if (login.status !== "MFA_REQUIRED")
        throw new Error("MFA challenge required");
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
      const { acceptInvitation } =
        await import("../../src/server/invitations/invitation.service");
      await acceptInvitation({
        token: legacyToken,
        password: randomBytes(24).toString("base64url"),
      });
      assert.equal(
        await db.roleAssignment.count({
          where: {
            userId: legacy.id,
            role: { key: "PROFESSIONAL" },
            organizationId: f.unit.id,
          },
        }),
        1,
      );
      writeFileSync(
        ".test-audit/m04-d-legacy-upgrade.json",
        JSON.stringify(
          {
            result: "PASS",
            exactLegacySnapshotsPreserved: true,
            backupRestored: true,
            rollForwardAfterRestore: true,
            migrateDeployIdempotent: true,
            originalVerifiedSessionValid: true,
            existingPasswordTotpLoginValid: true,
            legacyInstitutionalInvitationAccepted: true,
            automaticNewGrants: 0,
          },
          null,
          2,
        ),
      );
    } finally {
      await restoreClient.end();
    }
  } finally {
    await disconnect?.();
    await client.end();
    if (restored)
      await admin.query(`DROP DATABASE ${restoredName} WITH (FORCE)`);
    if (created) await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
    await admin.end();
    rmSync(dir, { recursive: true, force: true });
  }
});
