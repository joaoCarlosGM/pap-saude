import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createSession } from "../../src/server/auth/session.service";
import { clinicalRegistrationService } from "../../src/server/clinical-registration/registration.service";
import type { RegistrationData } from "../../src/types/registration";

after(() => db.$disconnect());
const child = process.env.PAP_P0_RUNTIME_CHILD === "1";
test(child ? "runtime restricted role completes, replays and cancels without identity UPDATE/DELETE" : "registration works with the actual least-privilege runtime login", async () => {
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.hostname, "127.0.0.1");
  assert.ok(["25441", "25445"].includes(url.port));
  assert.equal(url.pathname, "/pap_release_clinical_backend_test");
  if (child) {
    const [role] = await db.$queryRaw<Array<{ name: string; superuser: boolean }>>`SELECT current_user AS name, rolsuper AS superuser FROM pg_roles WHERE rolname=current_user`;
    assert.equal(role.name, "pap_pzero_runtime"); assert.equal(role.superuser, false);
    const identity = JSON.parse(process.env.PAP_P0_RUNTIME_IDENTITY!) as { sessionToken: string; organizationId: string; operationKey: string };
    const payload: RegistrationData = { cpf: "", nomeCompleto: "Pessoa sintética runtime", dataNascimento: "1990-01-01", primeiroAtendimento: true, dum: "2026-01-01", paSistolica: "120", paDiastolica: "80", frequenciaCardiaca: "90", frequenciaRespiratoria: "16", temperatura: "36.5", saturacaoO2: "98", nivelConsciencia: "ALERT", debitoUrinario: "", proteinuria: "", alturaUterina: "30", bcf: "140", movimentacaoFetal: "true", edema: "NONE", sangramentoVaginal: "false", pesoAtual: "65", queixasPrincipais: "", observacoesProfissional: "" };
    const result = await clinicalRegistrationService.submit({ ...identity, payload });
    assert.equal(result.status, "COMPLETED"); assert.equal(result.replayed, false);
    const replay = await clinicalRegistrationService.submit({ ...identity, payload });
    assert.equal(replay.replayed, true); assert.deepEqual(replay.registration, result.registration);
    assert.equal((await clinicalRegistrationService.status(identity)).status, "COMPLETED");
    assert.equal(await db.clinicalProvenanceEvent.count({ where: { encounterId: result.registration.encounterId } }), 2);
    const cancelled = { ...identity, operationKey: randomUUID() };
    assert.equal((await clinicalRegistrationService.cancel(cancelled)).status, "CANCELLED");
    await assert.rejects(clinicalRegistrationService.submit({ ...cancelled, payload }));
    await assert.rejects(db.$executeRaw`DELETE FROM clinical_registration_operations WHERE false`);
    await assert.rejects(db.$executeRaw`UPDATE clinical_registration_operations SET "keyHash"="keyHash" WHERE false`);
    return;
  }
  const [role] = await db.$queryRaw<Array<{ login: boolean; privileged: boolean }>>`SELECT rolcanlogin AS login, rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls AS privileged FROM pg_roles WHERE rolname='pap_pzero_runtime'`;
  assert.equal(role.login, false); assert.equal(role.privileged, false);
  await bootstrapSystemIam();
  const user = await db.user.create({ data: { email: `${randomUUID()}@synthetic.invalid`, displayName: "Profissional runtime sintético" } });
  const pap = await db.organization.create({ data: { name: "PAP runtime sintético", type: "PAP", status: "ACTIVE" } });
  const city = await db.organization.create({ data: { name: "Município runtime sintético", type: "MUNICIPALITY", status: "ACTIVE", parentId: pap.id } });
  const unit = await db.organization.create({ data: { name: "UBS runtime sintética", type: "HEALTH_UNIT", status: "ACTIVE", parentId: city.id } });
  await db.membership.create({ data: { userId: user.id, organizationId: unit.id, status: "ACTIVE" } });
  await assignSystemRole({ userId: user.id, roleKey: "PROFESSIONAL", organizationId: unit.id });
  const session = await createSession({ userId: user.id });
  const password = randomBytes(32).toString("hex");
  // A separate login proves real runtime grants; SET ROLE as a superuser would be insufficient.
  const [statement] = await db.$queryRaw<Array<{ sql: string }>>`SELECT format('ALTER ROLE pap_pzero_runtime LOGIN PASSWORD %L', ${password}::text) AS sql`;
  await db.$executeRawUnsafe(statement.sql);
  try {
    url.username = "pap_pzero_runtime"; url.password = password;
    const run = spawnSync("node_modules/.bin/tsx", ["--test", "tests/p0-remediation/registration-runtime.integration.test.ts"], {
      encoding: "utf8", timeout: 120_000, env: { ...process.env, DATABASE_URL: url.toString(), PAP_P0_RUNTIME_CHILD: "1", PAP_P0_RUNTIME_IDENTITY: JSON.stringify({ sessionToken: session.token, organizationId: unit.id, operationKey: randomUUID() }) },
    });
    if (run.status !== 0) process.stderr.write(run.stdout + run.stderr);
    assert.equal(run.status, 0, "least-privilege runtime child must pass");
  } finally {
    await db.$executeRawUnsafe("ALTER ROLE pap_pzero_runtime NOLOGIN PASSWORD NULL");
  }
});
