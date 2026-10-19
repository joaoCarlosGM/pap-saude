import { writeFileSync } from "node:fs";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createSession } from "../../src/server/auth/session.service";
async function main() {
  const rows = await db.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  if (rows[0]?.name !== "pap_saude_beta1_browser_test")
    throw new Error("DISPOSABLE_DATABASE_REQUIRED");
  const output = process.env.BETA_BROWSER_SESSION_FILE;
  if (!output?.startsWith("/tmp/"))
    throw new Error("PRIVATE_TMP_FILE_REQUIRED");
  await bootstrapSystemIam();
  const pap = await db.organization.create({
    data: {
      type: "PAP",
      name: "Rede sintética de homologação",
      status: "ACTIVE",
    },
  });
  const municipality = await db.organization.create({
    data: {
      type: "MUNICIPALITY",
      name: "Cidade Teste",
      city: "Cidade Teste",
      state: "SP",
      parentId: pap.id,
      status: "ACTIVE",
    },
  });
  const admin = await db.user.create({
    data: {
      displayName: "Administrador Sintético",
      email: "admin@synthetic.invalid",
    },
  });
  await assignSystemRole({ userId: admin.id, roleKey: "PAP_ADMIN" });
  await db.mfaFactor.create({
    data: {
      userId: admin.id,
      type: "TOTP",
      status: "ACTIVE",
      secretEncrypted: "synthetic-browser-fixture-only",
      createdAt: new Date(Date.now() - 2000),
      enabledAt: new Date(Date.now() - 1000),
    },
  });
  const session = await createSession({ userId: admin.id, mfaVerified: true });
  // Skip the already covered guided tour so it does not obscure the screenshots.
  await db.userOnboardingProgress.create({
    data: {
      userId: admin.id,
      tourKey: "admin-core",
      tourVersion: 1,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  writeFileSync(
    output,
    JSON.stringify({ token: session.token, municipalityId: municipality.id }),
    { mode: 0o600 },
  );
}
main().finally(() => db.$disconnect());
