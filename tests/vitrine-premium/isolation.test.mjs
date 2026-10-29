import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const root='src/features/vitrine-premium/'
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+e.name+'/'):[dir+e.name])}
test('Premium runtime dependency graph never imports operational code, database or clinical APIs',()=>{
 for(const path of files(root)){
  const text=readFileSync(path,'utf8');assert.ok(!/\bfetch\s*\(|\/api\/|@\/server\/|@\/lib\/clinical|prisma|postgresql:\/\//i.test(text),path)
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](@\/[^'"]+)/g))assert.ok(match[1].startsWith('@/features/vitrine-premium/'),`${path}: ${match[1]}`)
 }
})
test('no root operational route literal in synthetic components; only explicit Commercial return escapes namespace',()=>{
 for(const path of files(root)){
  const text=readFileSync(path,'utf8');assert.ok(!/["'`]\/(dashboard|pacientes|registro|atendimentos|chat|protocolos|cursos|ferramentas|configuracoes)(?:[\/"'`?])/.test(text),path)
 }
 assert.ok(readFileSync(root+'components/layout/Sidebar.tsx','utf8').includes('href="/comercial"'))
 assert.ok(readFileSync(root+'components/layout/DashboardShell.tsx','utf8').includes("next.pathname.startsWith('/vitrine/')"))
})
test('operational security, clinical pages, MEOWS, Prisma and API remain byte-for-byte identical to approved P0',()=>{
 const paths=['src/server','prisma','src/app/(dashboard)','src/app/api','src/components/layout','src/components/registro','src/lib/meows.ts','src/app/globals.css','src/app/layout.tsx','package-lock.json','package.json','src/types','next.config.ts','tsconfig.json','src/app/(auth)','.github','Dockerfile','scripts/local']
 for(const path of paths)assert.equal(execFileSync('git',['diff','7526cb95454017ede8a77113f91ce3b43e2dc7df','--',path],{encoding:'utf8'}),'',path)
})
test('all showcase server leaves retain explicit commercial guard before mounting Premium and query rejection',()=>{
 for(const path of ['src/app/(showcase)/vitrine/layout.tsx','src/app/(showcase)/vitrine/page.tsx','src/app/(showcase)/vitrine/[section]/page.tsx','src/app/(showcase)/vitrine/pacientes/[id]/page.tsx']){
  const text=readFileSync(path,'utf8');assert.ok(text.includes('await requireCommercialPageSession()'),path);if(!path.endsWith('/layout.tsx'))assert.ok(text.includes('notFound()'),path)
 }
 assert.ok(readFileSync(root+'components/pacientes/DemoPatientView.tsx','utf8').includes('notFound()'))
 assert.ok(readFileSync(root+'lib/demo/welcome-session.ts','utf8').includes('pap.vitrine.premium.welcome.v2'))
})
