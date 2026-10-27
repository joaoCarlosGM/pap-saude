import { db } from "../../src/server/db/client";
import { globalGovernanceSummary } from "../../src/server/admin-beta/governance-metrics.service";
let phase = "ROLE";
async function main() {
  const [role] = await db.$queryRaw<Array<{ user: string }>>`SELECT current_user AS "user"`;
  if (role.user !== "pap_p0_governance_reader") throw new Error("ROLE_NOT_RESTRICTED");
  const [access] = await db.$queryRaw<Array<{ patient: boolean; encounter: boolean; password: boolean; recovery: boolean; factorSecret: boolean }>>`
    SELECT has_table_privilege(current_user, 'patients', 'SELECT') AS patient,
           has_table_privilege(current_user, 'encounters', 'SELECT') AS encounter,
           has_table_privilege(current_user, 'password_credentials', 'SELECT') AS password,
           has_table_privilege(current_user, 'mfa_recovery_codes', 'SELECT') AS recovery,
           has_column_privilege(current_user, 'mfa_factors', 'secretEncrypted', 'SELECT') AS "factorSecret"
  `;
  if (!access || Object.values(access).some(Boolean)) throw new Error("PRIVATE_DATABASE_GRANT_PRESENT");
  phase = "CLINICAL_DENIAL";
  for (const read of [
    () => db.patient.count(),
    () => db.encounter.count(),
    () => db.vitalSigns.count(),
    () => db.obstetricData.count(),
    () => db.clinicalEvaluation.count(),
    () => db.passwordCredential.count(),
    () => db.mfaRecoveryCode.count(),
    () => db.mfaFactor.findFirst({ select: { secretEncrypted: true } }),
  ]) {
    let denied = false;
    try { await read(); } catch { denied = true; }
    if (!denied) throw new Error("PRIVATE_READ_NOT_DENIED");
  }
  phase = "SUMMARY";
  const result = await globalGovernanceSummary(process.env.PAP_TEST_ACTOR_ID!, process.env.PAP_TEST_SESSION_TOKEN,
    new Date(process.env.PAP_TEST_PERIOD_START!), new Date(process.env.PAP_TEST_PERIOD_END!));
  if (!result || result.scope !== "PAP_GLOBAL") throw new Error("GOVERNANCE_READ_FAILED");
  process.stdout.write("READONLY_GOVERNANCE_PASS\n");
}
main().catch(error => {
  const code = typeof error?.code === "string" && /^[A-Z0-9_]{1,16}$/.test(error.code) ? error.code : "UNKNOWN";
  const table = String(error?.message).match(/permission denied for (?:table|relation) ([a-z_]+)/)?.[1] ?? "UNKNOWN";
  process.stderr.write(`READONLY_GOVERNANCE_FAILED|${phase}|${code}|${table}\n`);
  process.exitCode = 1;
})
  .finally(() => db.$disconnect());
