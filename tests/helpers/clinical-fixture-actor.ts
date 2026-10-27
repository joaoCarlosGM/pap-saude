import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import type { ClinicalMeasurementActorContext } from "../../src/server/clinical-revision/clinical-provenance.service";

/** Test data only. The production service still requires a real attributed actor. */
export async function clinicalFixtureActor(encounterId: string): Promise<ClinicalMeasurementActorContext> {
  const url = new URL(process.env.DATABASE_URL || "");
  const databases = new Set([
    "pap_saude_f02b_test", "pap_saude_f03_vital_signs_test", "pap_saude_f03_obstetric_data_test",
    "pap_saude_f03_meows_test", "pap_saude_f03_clinical_governance_test", "pap_saude_f03_clinical_api_ui_test",
  ]);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !databases.has(url.pathname.slice(1)) || url.port === "15432") {
    throw new Error("BLOCKED: clinical fixture actor requires an explicit disposable test database");
  }
  const encounter = await db.encounter.findUniqueOrThrow({ where: { id: encounterId } });
  let role = await db.role.findUnique({ where: { key: "PROFESSIONAL" } });
  if (!role) { await bootstrapSystemIam(); role = await db.role.findUniqueOrThrow({ where: { key: "PROFESSIONAL" } }); }
  const user = await db.user.upsert({
    where: { email: `${encounter.organizationId}@p0-fixture.synthetic.invalid` },
    create: { email: `${encounter.organizationId}@p0-fixture.synthetic.invalid`, displayName: "Synthetic clinical fixture author" },
    update: {},
  });
  await db.membership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: encounter.organizationId } },
    create: { userId: user.id, organizationId: encounter.organizationId, status: "ACTIVE" }, update: {} });
  await db.roleAssignment.upsert({ where: { userId_roleId_organizationId: { userId: user.id, roleId: role.id, organizationId: encounter.organizationId } },
    create: { userId: user.id, roleId: role.id, organizationId: encounter.organizationId }, update: {} });
  return { actorUserId: user.id, organizationId: encounter.organizationId };
}
