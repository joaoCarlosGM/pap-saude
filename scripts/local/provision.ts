import { assertLabDatabaseUrl, localLabProfile } from "../../src/lib/local-lab-profiles.mjs";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import {
  hashPassword,
  validatePasswordPolicy,
} from "../../src/server/auth/password";
import { writeAdminAudit } from "../../src/server/audit/admin-audit-writer.service";

export async function assertLocalDatabase() {
  const profile = localLabProfile(process.env.PAP_LOCAL_PROFILE || "admin-beta1");
  if (process.env.NODE_ENV !== "development" || process.env.PAP_LOCAL_DEMO !== "1")
    throw new Error("LOCAL_DATABASE_ONLY");
  assertLabDatabaseUrl(process.env.DATABASE_URL || "", profile.name);
  const rows = await db.$queryRaw<
    Array<{ name: string; marker: string }>
  >`SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
  if (
    rows[0]?.name !== profile.database ||
    rows[0]?.marker !== profile.marker
  )
    throw new Error("LOCAL_DATABASE_MARKER_REQUIRED");
}
export async function provisionFirstAdmin(input: {
  email: string;
  displayName: string;
  password: string;
}) {
  await assertLocalDatabase();
  const email = input.email.trim().toLowerCase(),
    displayName = input.displayName.trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    displayName.length < 2 ||
    displayName.length > 200
  )
    throw new Error("INVALID_OPERATOR_INPUT");
  validatePasswordPolicy(input.password);
  if ((await db.user.count()) || (await db.organization.count()))
    throw new Error("LOCAL_DATABASE_NOT_EMPTY");
  const passwordHash = await hashPassword(input.password);
  await bootstrapSystemIam();
  await db.$transaction(
    async (tx) => {
      if ((await tx.user.count()) || (await tx.roleAssignment.count()))
        throw new Error("LOCAL_ADMIN_ALREADY_PROVISIONED");
      if (await tx.organization.count())
        throw new Error("LOCAL_DATABASE_NOT_EMPTY");
      await tx.organization.create({
        data: {
          type: "PAP",
          status: "ACTIVE",
          name: "PAP Saúde — desenvolvimento local",
          isActive: true,
        },
      });
      const user = await tx.user.create({
        data: { email, displayName, isActive: true },
      });
      await tx.passwordCredential.create({
        data: {
          userId: user.id,
          passwordHash,
          algorithm: "ARGON2ID",
          mustChange: false,
        },
      });
      await assignSystemRole({ userId: user.id, roleKey: "PAP_ADMIN" }, tx);
      await writeAdminAudit(
        {
          actorUserId: user.id,
          action: "ROLE_ASSIGNED",
          resourceType: "ROLE_ASSIGNMENT",
          after: {
            targetUserId: user.id,
            roleKey: "PAP_ADMIN",
            organizationId: null,
          },
        },
        tx,
      );
    },
    { isolationLevel: "Serializable" },
  );
}
async function main() {
  await assertLocalDatabase();
  if (process.argv[2] === "iam") {
    await bootstrapSystemIam();
    console.log("IAM local inicializado (idempotente).");
    return;
  }
  if (process.argv[2] !== "admin") throw new Error("UNKNOWN_LOCAL_OPERATION");
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk;
    if (text.length > 4096) throw new Error("INVALID_OPERATOR_INPUT");
  }
  await provisionFirstAdmin(JSON.parse(text));
  console.log(
    "Primeiro PAP_ADMIN local provisionado. Faça login e configure MFA em Minha segurança.",
  );
}
if (
  process.argv[1]?.endsWith("/provision.ts") ||
  process.argv[1]?.endsWith("\\provision.ts")
)
  main()
    .catch(() => {
      console.error(
        "Provisionamento local recusado. Verifique banco vazio, marker e política de senha; nenhuma conta existente foi alterada.",
      );
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
