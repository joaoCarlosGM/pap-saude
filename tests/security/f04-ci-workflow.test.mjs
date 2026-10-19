import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

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


test('deploy SSH remains one command with complete arguments, without network access', () => {
 const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
 const command = ci.jobs.deploy.steps.find(step => step.name === 'Deploy application')?.run;
 assert.equal(typeof command, 'string');
 const root = mkdtempSync(join(tmpdir(), 'f0410-ssh-'));
 const capture = join(root, 'ssh-arguments.jsonl');
 const home = join(root, 'synthetic-home');
 const sha = 'a'.repeat(40);
 try {
  // Only this write-only SSH stub is reachable through PATH. No real SSH,
  // production environment, key or network operation is used by the test.
  const stub = join(root, 'ssh');
  writeFileSync(stub, `#!${process.execPath}\nimport('node:fs').then(fs => fs.appendFileSync(process.env.SSH_CAPTURE, JSON.stringify(process.argv.slice(2)) + '\\n'));\n`, { mode: 0o700 });
  function run(script) {
   rmSync(capture, { force: true });
   const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script], {
    encoding: 'utf8', timeout: 5000,
    env: { PATH: root, HOME: home, SSH_CAPTURE: capture, VPS_PORT: '2222', VPS_HOST: 'vps.invalid', VPS_USER: 'synthetic', DEPLOY_SHA: sha },
   });
   return { result, calls: (() => {
    try { return readFileSync(capture, 'utf8').trim().split('\n').map(line => JSON.parse(line)); }
    catch { return []; }
   })() };
  }
  function assertSingleSsh({ result, calls }) {
   assert.equal(result.error, undefined);
   assert.equal(result.status, 0, result.stderr);
   assert.deepEqual(calls, [[
    '-p', '2222', '-i', join(home, '.ssh/pap_deploy'),
    '-o', 'StrictHostKeyChecking=yes', '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
    'synthetic@vps.invalid', `sudo -n /opt/pap-saude/scripts/deploy.sh '${sha}'`,
   ]]);
  }
  assertSingleSsh(run(command));
  // bash -n alone accepts these broken scripts. Execute each regression with
  // the stub to prove that losing either continuation is actually detected.
  for (const option of ['StrictHostKeyChecking=yes', 'BatchMode=yes']) {
   const broken = command.replace(`${option} \\\n`, `${option}\n`);
   assert.notEqual(broken, command, `must remove the continuation after ${option}`);
   assert.throws(() => assertSingleSsh(run(broken)), { name: 'AssertionError' });
  }
 } finally { rmSync(root, { recursive: true, force: true }); }
});
