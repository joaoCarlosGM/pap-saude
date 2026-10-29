import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
test('real standalone artifact excludes private laboratory settings, mail, logs and Git metadata',()=>{
 assert.ok(existsSync('.next/standalone/server.js'),'build the real release first');
 const forbidden=[];
 function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,e.name);
  if(['.local','.test-audit','.git'].includes(e.name)||e.name==='.env'||(e.name.startsWith('.env.')&&e.name!=='.env.example'))forbidden.push(p);
  if(e.isDirectory())walk(p);
 }}
 walk('.next/standalone');assert.deepEqual(forbidden,[],'private files must not be distributed');
});
test('Docker context excludes the same private files before image construction',()=>{
 const ignore=readFileSync('.dockerignore','utf8');for(const pattern of ['.local','.test-audit','.env','.env.*','.git'])assert.ok(ignore.split('\n').includes(pattern),pattern);
});
