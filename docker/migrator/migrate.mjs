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
  return legacy.rows[0].present;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Serializes cooperating migrators; operators MUST also quiesce legacy writers.
    await client.query("SELECT pg_advisory_lock(4101027)");
    const expected = fs.readdirSync('/app/prisma/migrations').filter(p => fs.existsSync(`/app/prisma/migrations/${p}/migration.sql`)).sort();
    const history = await client.query("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present");
    if (history.rows[0].present) {
      const { rows } = await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
      if (rows.length > expected.length || rows.some((r, i) => r.migration_name !== expected[i] || !r.finished_at || r.rolled_back_at || r.checksum !== createHash('sha256').update(fs.readFileSync(`/app/prisma/migrations/${expected[i]}/migration.sql`)).digest('hex'))) throw new Error('MIGRATION_HISTORY_INVALID');
    }
    const legacy = await preflightLegacyData(client);
    if (legacy) {
      if (process.env.F04_LEGACY_MAINTENANCE !== 'writers-stopped') throw new Error('MAINTENANCE_REQUIRED');
      const sessions = await client.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'");
      if (sessions.rows[0].count !== 0) throw new Error('LEGACY_CONNECTIONS_PRESENT');
    }
    const code = await new Promise((resolve, reject) => {
      const child = spawn('/app/node_modules/.bin/prisma', ['migrate', 'deploy'], { stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', code => resolve(code ?? 1));
    });
    if (code !== 0) throw new Error('MIGRATION_FAILED: web must not start');
    const { rows } = await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
    if (rows.length !== expected.length || rows.some((r, i) => r.migration_name !== expected[i] || !r.finished_at || r.rolled_back_at || r.checksum !== createHash('sha256').update(fs.readFileSync(`/app/prisma/migrations/${expected[i]}/migration.sql`)).digest('hex'))) throw new Error('MIGRATION_HISTORY_INVALID');
    console.log(`PASS migration history: ${expected.length}`);
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  const known = ['LEGACY_DATA_BLOCKED', 'MIGRATION_FAILED', 'MIGRATION_HISTORY_INVALID', 'MAINTENANCE_REQUIRED', 'LEGACY_CONNECTIONS_PRESENT'];
  const code = error instanceof Error ? error.message.split(':')[0] : '';
  console.error(`MIGRATOR_ABORTED ${known.includes(code) ? code : 'CONNECTION_OR_CONFIG_ERROR'}: web must remain stopped`);
  process.exitCode = 1;
});
