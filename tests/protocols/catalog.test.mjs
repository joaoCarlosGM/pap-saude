import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {demoProtocols:catalog,demoProtocolSchema,filterProtocols,emptyProtocolFilters,parseProtocolLocation,protocolHref,protocolTabs,reportedDate}=require('../../src/features/vitrine-premium/lib/protocol-catalog.ts');
const React=require('react'),{renderToStaticMarkup:render}=require('react-dom/server');
const Page=require('../../src/features/vitrine-premium/views/protocolos.tsx').default;
const {DEMO_TOUR_STEPS}=require('../../src/features/vitrine-premium/lib/showcase-tour.ts');
test('exactly three reported, unapproved references; missing PDFs never acquire an URL',()=>{
 assert.equal(catalog.length,3);assert.equal(new Set(catalog.map(p=>p.slug)).size,3);
 for(const p of catalog){assert.equal(p.status,'IN_REVIEW');assert.equal(p.document.availability,'MISSING');assert.equal(p.document.expectedSha256.length,64);assert.ok(!('url' in p.document));}
 const sepse=catalog[2];assert.deepEqual(sepse.codes,['PRT.UPS.007','PRT.DMED.013']);assert.ok(sepse.identificationNote);assert.equal(sepse.reportedReviewDue,undefined);assert.equal(reportedDate(), 'Não informada');
});
test('schema rejects unknown fields, fabricated approval, source URLs, bad hashes and duplicated checklist ids',()=>{
 for(const patch of [{status:'APPROVED'},{unexpected:true},{document:{...catalog[0].document,url:'https://example.invalid/fake.pdf'}},{document:{...catalog[0].document,expectedSha256:'invalid'}},{checklist:[...catalog[0].checklist,catalog[0].checklist[0]]}])assert.equal(demoProtocolSchema.safeParse({...catalog[0],...patch}).success,false);
});
test('search normalizes accents/case and matches code, keyword and combined finite filters',()=>{
 const find=(patch)=>filterProtocols(catalog,{...emptyProtocolFilters,...patch});
 assert.equal(find({query:'PRE ECLAMPSIA'})[0].slug,catalog[0].slug);assert.equal(find({query:'prt umul 003'})[0].slug,catalog[1].slug);
 assert.equal(find({theme:catalog[2].theme,origin:catalog[2].origin,version:catalog[2].version}).length,1);assert.equal(find({query:'inexistente'}).length,0);assert.equal(find({theme:catalog[0].theme,origin:catalog[2].origin}).length,0);assert.equal(find({}).length,3);
});
test('all twelve finite deep links have stable query contracts and preserve the allowed pathname',()=>{
 assert.deepEqual(parseProtocolLocation({}),{view:'library'});
 for(const p of catalog)for(const tab of protocolTabs){const url=new URL(protocolHref(p.slug,tab.id),'https://example.invalid');assert.equal(url.pathname,'/vitrine/protocolos');assert.deepEqual(parseProtocolLocation(Object.fromEntries(url.searchParams)),{view:'detail',slug:p.slug,tab:tab.id});}
 assert.equal(parseProtocolLocation({protocolo:catalog[0].slug}).tab,'visao-geral');
});
test('unknown, duplicated, cross-tenant and traversal query values are denied',()=>{
 for(const query of [{aba:'checklist'},{protocolo:'../registro'},{protocolo:['a','b']},{protocolo:catalog[0].slug,aba:['checklist','fluxograma']},{protocolo:catalog[0].slug,aba:'clinical'},{protocolo:catalog[0].slug,tenant:'real'},{role:'PAP_ADMIN'}])assert.equal(parseProtocolLocation(query),null);
});
test('fourth protocol is accepted by data alone and uses the same renderer and four tabs',()=>{
 const fourth=demoProtocolSchema.parse({...catalog[0],slug:'quarta-referencia-teste',title:'Referência adicional somente de teste',sections:[{id:'teste',title:'Tópico adicional',description:'Referência neutra em preparação.'}]});
 const extended=[...catalog,fourth];assert.equal(parseProtocolLocation({protocolo:fourth.slug},extended).slug,fourth.slug);
 const html=render(React.createElement(Page,{protocols:extended,location:{view:'detail',slug:fourth.slug,tab:'visao-geral'}}));assert.ok(html.includes(fourth.title));assert.ok(html.includes('Tópico adicional'));assert.equal((html.match(/role="tab"/g)||[]).length,4);assert.ok(!catalog.some(p=>p.slug===fourth.slug));
});
test('SSR preserves explicit missing PDF and disables every document action without fake downloads',()=>{
 for(const p of catalog){const html=render(React.createElement(Page,{location:{view:'detail',slug:p.slug,tab:'documento-original'}}));assert.ok(html.includes('PDF original indisponível'));assert.equal((html.match(/disabled=""/g)||[]).length,2);assert.ok(!/download=|href="[^"]*\.pdf|<iframe|<embed/i.test(html));assert.ok(html.includes('Original indisponível neste ambiente'));}
});
test('loading, genuine empty catalogue, error and missing-data states render without false success',()=>{
 for(const [props,text]of [[{state:'loading'},'Carregando biblioteca'],[{state:'error'},'Catálogo indisponível'],[{protocols:[]},'Nenhum documento em preparação'],[{location:{view:'detail',slug:'absent',tab:'checklist'}},'Protocolo não encontrado']])assert.ok(render(React.createElement(Page,props)).includes(text));
});
test('checklist and flow are documentary-only and do not create clinical actions or persistence',()=>{
 const check=render(React.createElement(Page,{location:{view:'detail',slug:catalog[0].slug,tab:'checklist'}}));assert.equal((check.match(/type="checkbox"/g)||[]).length,6);assert.ok(check.includes('sem registro de condutas'));assert.ok(!/fetch\(|localStorage|sessionStorage/.test(readFileSync('src/features/vitrine-premium/views/protocolos.tsx','utf8')));
 const flow=render(React.createElement(Page,{location:{view:'detail',slug:catalog[0].slug,tab:'fluxograma'}}));assert.ok(flow.includes('Mapa navegável do fluxograma'));assert.ok(flow.includes('Figura original'));assert.ok(flow.includes('Critérios indicados na figura'));assert.ok(!/<canvas|<iframe|<embed/.test(flow));assert.ok(!flow.includes('Aguardando PDF original e autorização'));
});
test('derived six-step tutorial does not navigate to paused modules and frozen core is unchanged',()=>{
 assert.equal(DEMO_TOUR_STEPS.length,6);for(const step of DEMO_TOUR_STEPS)assert.ok(!/\/vitrine\/(chat|cursos)/.test(step.path));
 assert.equal(execFileSync('git',['diff','12f67cd','--','src/features/vitrine-premium/lib/demo','src/features/vitrine-premium/types',':(exclude)src/features/vitrine-premium/lib/demo/data.ts',':(exclude)src/features/vitrine-premium/types/registration.ts',':(exclude)src/features/vitrine-premium/types/paciente.ts'],{encoding:'utf8'}),'');
});
test('commercial guards remain before query parsing and the original course player stays guarded',()=>{
 const file=readFileSync('src/app/(showcase)/vitrine/[section]/page.tsx','utf8');assert.ok(file.indexOf('await requireCommercialPageSession()')<file.indexOf('parseProtocolLocation(search)'));assert.ok(file.includes('if(!location)notFound()'));
 const player=readFileSync('src/app/(showcase)/vitrine/aprender/[id]/page.tsx','utf8');assert.ok(player.includes('await requireCommercialPageSession()'));assert.ok(player.includes('ShowcaseUnavailable'));assert.ok(!player.includes('DemoLearning'));
 for(const p of ['src/server','src/app/api','prisma','deploy','src/proxy.ts','src/lib/admin-beta-policy.ts','src/app/(app)'])assert.equal(execFileSync('git',['diff','12f67cd','--',p],{encoding:'utf8'}),'',p);
});

test('original-document page deep links are bounded integers and remain exclusive to that tab',()=>{
 for(const p of catalog){assert.deepEqual(parseProtocolLocation({protocolo:p.slug,aba:'documento-original',pagina:String(p.document.reportedPageCount)}),{view:'detail',slug:p.slug,tab:'documento-original',page:p.document.reportedPageCount});}
 for(const value of ['0','-1','01','1.5','1e2','999','NaN',['1','2']])assert.equal(parseProtocolLocation({protocolo:catalog[0].slug,aba:'documento-original',pagina:value}),null);
 assert.equal(parseProtocolLocation({protocolo:catalog[0].slug,aba:'checklist',pagina:'1'}),null);
});

test('private document capabilities cannot redirect the PDF renderer to arbitrary or clinical URLs',()=>{
 const {OriginalDocumentProvider}=require('../../src/features/vitrine-premium/components/protocolos/OriginalDocumentContext.tsx'),{originalDocuments}=require('../../src/features/vitrine-premium/lib/protocol-originals.ts'),d=originalDocuments[0];
 for(const entry of [{...d,url:'/api/clinical/patients',downloadUrl:'/api/clinical/patients'},{...d,slug:'../../api/clinical/patients',url:'/homologacao/documentos/../../api/clinical/patients',downloadUrl:'/homologacao/documentos/../../api/clinical/patients?download=1'},{...d,sha256:'f'.repeat(64),url:'/homologacao/documentos/'+d.slug,downloadUrl:'/homologacao/documentos/'+d.slug+'?download=1'}]){
  const html=render(React.createElement(OriginalDocumentProvider,{documents:[entry]},React.createElement(Page,{location:{view:'detail',slug:d.slug,tab:'documento-original'}})));assert.ok(html.includes('PDF original indisponível'));assert.ok(!html.includes('/api/clinical'));
 }
});
