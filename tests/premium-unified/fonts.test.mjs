import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('self-hosted approved families retain publisher integrity, license and binary hashes',()=>{
 const rows=JSON.parse(readFileSync('src/app/fonts/provenance.json','utf8'));
 assert.equal(rows.length,6);
 for(const row of rows){
  const data=readFileSync('src/app/fonts/'+row.file);
  assert.equal(createHash('sha256').update(data).digest('hex'),row.sha256);
  assert.equal(row.license,'OFL-1.1');assert.match(row.tarball,/^https:\/\/registry\.npmjs\.org\/@fontsource-variable\//);
  assert.match(row.tarballIntegrity,/^sha512-/);
  if(row.file.endsWith('.woff2'))assert.equal(data.subarray(0,4).toString(),'wOF2');
  else {assert.match(data.toString(),/SIL OPEN FONT LICENSE/);assert.deepEqual(readFileSync('public/licenses/fonts/'+row.file),data,'licenses must accompany distributed public assets/images');}
 }
});
test('root typography is local and retains Inter, Geist and mono CSS variables',()=>{
 const source=readFileSync('src/app/layout.tsx','utf8');assert.match(source,/next\/font\/local/);assert.doesNotMatch(source,/next\/font\/google/);
 for(const variable of ['--font-sans','--font-geist-sans','--font-geist-mono'])assert.ok(source.includes(variable));
});
