import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('release guard rejects adversarial workflow changes', () => {
 const root = mkdtempSync(join(tmpdir(),'f0410-ci-'));
 const guard = resolve('scripts/security/guard-f04-ci-workflow.mjs');
 try {
  for (const file of ['.github/workflows/ci.yml','Dockerfile','prisma.config.ts','scripts/test-f04-db-invariants.sh','scripts/audit-f04-operations.sh','docker/migrator/package.json','docker/migrator/package-lock.json','package-lock.json','scripts/test-f04-migrator-image.sh','.dockerignore']) {
   mkdirSync(dirname(join(root,file)),{recursive:true}); copyFileSync(file,join(root,file));
  }
  const workflow = readFileSync(join(root,'.github/workflows/ci.yml'),'utf8');
  const run = () => spawnSync(process.execPath,[guard],{cwd:root,encoding:'utf8'}).status;
  assert.equal(run(),0,'current workflow must pass');
  const mutations = [
   workflow.replace("if: github.event_name == 'push' && github.ref == 'refs/heads/prod'", "if: github.event_name == 'push' && github.ref == 'refs/heads/prod' || github.event_name == 'pull_request'"),
   workflow.replace('needs: validate','needs: []'),
   workflow.replace('environment: production','environment: unprotected'),
   workflow.replace(/actions\/checkout@[a-f0-9]{40}/g,'actions/checkout@v4'),
   workflow.replace('run: npm run audit:f04:operations','run: echo skipped'),
   workflow.replace('run: bash scripts/security/scan-f04-images.sh pap-saude:ci pap-saude-migrator:ci','run: echo scan-skipped'),
  ];
  for (const [index,mutation] of mutations.entries()) {
   assert.notEqual(mutation,workflow,`mutation ${index} must actually alter input`);
   writeFileSync(join(root,'.github/workflows/ci.yml'),mutation);
   assert.notEqual(run(),0,`unsafe workflow mutation ${index} must fail closed`);
  }
 } finally { rmSync(root,{recursive:true,force:true}); }
});
