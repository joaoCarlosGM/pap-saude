import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
test('unified branch runs validation while both publishing actions stay exclusive to prod',()=>{
 const ci=parse(readFileSync('.github/workflows/ci.yml','utf8'));
 assert.ok(ci.on.push.branches.includes('feature/p0-premium-unified-rc'));
 assert.equal(ci.permissions.contents,'read');assert.equal(ci.jobs.publish.needs,'validate');assert.equal(ci.jobs.deploy.needs,'publish');
 for(const job of ['publish','deploy'])assert.equal(ci.jobs[job].if,"github.event_name == 'push' && github.ref == 'refs/heads/prod'");
 const commands=ci.jobs.validate.steps.map(s=>s.run||'').join('\n');
 for(const gate of ['test:premium:unified','audit:f04:operations','test:auth','test:first-access:browser','test:mission04:b:browser','test:mission04:c:browser','test:mission04:d:browser','test:mission04:e:browser','scan-f04-images.sh'])assert.ok(commands.includes(gate),gate);
});
test('actual SQL-context gate accepts only allowlisted GitHub push/PR contexts, without contacting any database',()=>{
 const body=readFileSync('scripts/test-f04-db-invariants.sh','utf8');
 const start=body.indexOf("if [[ \"${GITHUB_ACTIONS:-}\""),end=body.indexOf('\nEXISTING=',start);assert.ok(start>0&&end>start);
 const gate=body.slice(start,end);
 const run=(event,ref,repo='joaoCarlosGM/pap-saude')=>spawnSync('bash',['-c',gate],{encoding:'utf8',env:{PATH:process.env.PATH,GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_EVENT_NAME:event,GITHUB_REF:ref,GITHUB_BASE_REF:''}}).status;
 assert.equal(run('push','refs/heads/feature/p0-premium-unified-rc'),0);
 assert.equal(run('push','refs/heads/codex/p0-full-implementation'),0);
 assert.notEqual(run('push','refs/heads/untrusted'),0);
 assert.notEqual(run('workflow_dispatch','refs/heads/feature/p0-premium-unified-rc'),0);
});
