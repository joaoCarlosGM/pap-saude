import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {authorizedAreas} from '../../src/components/premium/AreaLinks';
import {parseMetric,formatMetric} from '../../src/components/premium/metrics';
import type {EffectiveAccessProfile} from '../../src/lib/admin/types';
const empty:EffectiveAccessProfile={user:{id:'test',displayName:'Pessoa sintética',email:'test@example.invalid'},roles:[],permissions:[],organizations:[],canAccessAdmin:false};
const unit={id:'unit',name:'UBS de teste',type:'HEALTH_UNIT' as const,parentId:null};
const clinical={key:'PROFESSIONAL',name:'Profissional',scope:'HEALTH_UNIT' as const,organization:unit,permissions:['patient.read','encounter.read']};
const commercial={key:'COMMERCIAL',name:'Comercial',scope:'GLOBAL' as const,organization:null,permissions:['commercial.read']};
test('no effective grant produces no area',()=>assert.deepEqual(authorizedAreas(empty),[]));
test('admin-only never receives implicit clinical or commercial destination',()=>assert.deepEqual(authorizedAreas({...empty,canAccessAdmin:true}).map(a=>a.href),['/admin']));
test('clinical and commercial require their real role scope and permissions',()=>{
 assert.deepEqual(authorizedAreas({...empty,roles:[clinical]}).map(a=>a.href),['/dashboard']);
 assert.deepEqual(authorizedAreas({...empty,roles:[commercial]}).map(a=>a.href),['/comercial']);
 assert.deepEqual(authorizedAreas({...empty,roles:[{...clinical,organization:null},{...commercial,permissions:[]}]}),[]);
});
test('combined roles expose only server-authorized area choices',()=>assert.deepEqual(authorizedAreas({...empty,canAccessAdmin:true,roles:[clinical,commercial]}).map(a=>a.href),['/admin','/dashboard','/comercial']));
test('animation keeps missing/suppressed/composite values honest and zeros exact',()=>{
 for(const text of ['—','Indisponível','Suprimido','3 / 4','Amostra insuficiente'])assert.equal(parseMetric(text),null);
 assert.equal(parseMetric('0')?.target,0);
 const p=parseMetric('12,5%')!;assert.equal(formatMetric(100,p),'12,5%');assert.equal(formatMetric(-3,p),'0,0%');
});
test('shared presentation cannot import synthetic state, backend or clinical services',()=>{
 for(const name of readdirSync('src/components/premium').filter(n=>/\.(ts|tsx)$/.test(n))){
  const source=readFileSync(`src/components/premium/${name}`,'utf8');
  assert.doesNotMatch(source, /(?:from\s*['"]|import\s*['"])[^'"]*(?:features\/vitrine|lib\/demo|server\/|prisma|fixtures)/,name);
 }
});
