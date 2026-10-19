/* Fail closed before historical destructive migrations. No credentials in output. */
import pg from 'pg';
const { Client } = pg;
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export async function preflightLegacyData(client) {
  const legacy = await client.query("SELECT to_regclass('public.admissions') IS NOT NULL AS present");
    if (legacy.rows[0].present) {
      for (const table of ['admissions', 'clinical_evaluations', 'patients']) {
        const result = await client.query(`SELECT EXISTS (SELECT 1 FROM public.${table} LIMIT 1) AS populated`);
        if (result.rows[0].populated) throw new Error('LEGACY_DATA_BLOCKED: preserve and restore-test backup; approved data mapping required');
      }
    }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Serializes cooperating migrators; operators MUST also quiesce legacy writers.
    await client.query("SELECT pg_advisory_lock(4101027)");
    await preflightLegacyData(client);
    const code = await new Promise((resolve, reject) => {
      const child = spawn('/app/node_modules/.bin/prisma', ['migrate', 'deploy'], { stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', code => resolve(code ?? 1));
    });
    if (code !== 0) throw new Error('MIGRATION_FAILED: web must not start');
    const expected = fs.readdirSync('/app/prisma/migrations').filter(p => fs.existsSync(`/app/prisma/migrations/${p}/migration.sql`)).sort();
    const { rows } = await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
    if (rows.length !== expected.length || rows.some((r, i) => r.migration_name !== expected[i] || !r.finished_at || r.rolled_back_at || r.checksum !== createHash('sha256').update(fs.readFileSync(`/app/prisma/migrations/${expected[i]}/migration.sql`)).digest('hex'))) throw new Error('MIGRATION_HISTORY_INVALID');
    console.log(`PASS migration history: ${expected.length}`);
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error('MIGRATOR_ABORTED: legacy data, connection, schema or migration failure; review isolated logs. Web must remain stopped.'); process.exitCode = 1; });
