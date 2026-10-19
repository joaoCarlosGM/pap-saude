import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { preflightLegacyData } from '../../docker/migrator/migrate.mjs';

// Explicit disposable harness container only; no environment-supplied target.
test('legacy preflight aborts without mutation; backup restore preserves synthetic rows', async () => {
  assert.equal(execFileSync('docker', ['inspect', '-f', '{{index .Config.Labels "pap.disposable"}}', 'pap_saude_db'], {encoding:'utf8'}).trim(), 'f0410');
  const admin = new pg.Client({ connectionString:'postgresql://pap_user:pap_password@127.0.0.1:5432/postgres' });
  await admin.connect();
  const name = `pap_f0410_preflight_${process.pid}`;
  const restore = `${name}_restore`;
  let client;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    client = new pg.Client({ connectionString:`postgresql://pap_user:pap_password@127.0.0.1:5432/${name}` });
    await client.connect();
    await preflightLegacyData(client); // clean database
    await client.query(readFileSync('prisma/migrations/20260909150044_init_clinical_schema/migration.sql','utf8'));
    await preflightLegacyData(client); // empty legacy
    for (const scenario of ['patient','admission','evaluation']) {
      await client.query(`INSERT INTO patients (id,cpf,"fullName","birthDate","updatedAt","medicalRecordNo") VALUES ('synthetic','00000000000','SYNTHETIC','2000-01-01',now(),'preserve')`);
      if (scenario === 'admission') await client.query(`INSERT INTO admissions (id,"patientId","chiefComplaint") VALUES ('synthetic','synthetic','SYNTHETIC')`);
      if (scenario === 'evaluation') await client.query(`INSERT INTO clinical_evaluations (id,"patientId","respiratoryRate","oxygenSaturation",temperature,"systolicBp","diastolicBp","heartRate","meowsScore","alertLevel") VALUES ('synthetic','synthetic',16,99,36.5,120,80,70,0,'GREEN')`);
      const snapshot = async c => (await c.query(`SELECT (SELECT jsonb_agg(p) FROM patients p) AS patients, (SELECT jsonb_agg(a) FROM admissions a) AS admissions, (SELECT jsonb_agg(e) FROM clinical_evaluations e) AS evaluations`)).rows;
      const before = await snapshot(client);
      await assert.rejects(preflightLegacyData(client), /LEGACY_DATA_BLOCKED/);
      assert.deepEqual(await snapshot(client),before);
      const dump = execFileSync('docker',['exec','pap_saude_db','pg_dump','-U','pap_user','-d',name,'-Fc']);
      await admin.query(`CREATE DATABASE ${restore}`);
      execFileSync('docker',['exec','-i','pap_saude_db','pg_restore','-U','pap_user','-d',restore,'--exit-on-error'],{input:dump});
      const restored = new pg.Client({ connectionString:`postgresql://pap_user:pap_password@127.0.0.1:5432/${restore}` });
      await restored.connect();
      try { assert.deepEqual(await snapshot(restored),before); } finally { await restored.end(); }
      await admin.query(`DROP DATABASE ${restore}`);
      await client.query("DELETE FROM patients WHERE id='synthetic'");
    }
    await preflightLegacyData(client);
  } finally {
    if (client) await client.end();
    // Names are generated here, never accepted from user input.
    await admin.query(`DROP DATABASE IF EXISTS ${restore} WITH (FORCE)`);
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
});
