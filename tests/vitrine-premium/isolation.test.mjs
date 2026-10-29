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
test('operational security, clinical services, MEOWS, Prisma and APIs remain unchanged by the authorized visual unification',()=>{
 const paths=['prisma','src/app/api','src/server/auth','src/server/iam','src/server/clinical','src/server/clinical-registration','src/server/vital-signs','src/server/obstetric-data','src/server/clinical-revision','src/server/meows','src/lib/clinical-api','src/lib/meows.ts','src/app/globals.css','package-lock.json','tsconfig.json','src/app/(auth)','Dockerfile','src/features/vitrine-premium','src/app/(showcase)']
 for(const path of paths)assert.equal(execFileSync('git',['diff','b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a','--',path],{encoding:'utf8'}),'',path)
 const errorPaths=['src/server/encounters/encounter.errors.ts','src/server/patients/patient.errors.ts','src/server/patients/patient-organization.errors.ts','src/server/pregnancies/pregnancy.errors.ts']
 const encounterFiles=execFileSync('git',['ls-files','src/server/encounters','src/server/patients','src/server/pregnancies'],{encoding:'utf8'}).trim().split('\n').filter(p=>p&&!errorPaths.includes(p))
 for(const path of encounterFiles)assert.equal(execFileSync('git',['diff','b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a','--',path],{encoding:'utf8'}),'',path)
 for(const path of errorPaths){const before=execFileSync('git',['show',`b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a:${path}`],{encoding:'utf8'});const after=readFileSync(path,'utf8');const normalize=s=>s.replace(/^    this.name = (?:new.target.name|"[^"]+");\n/gm,'');assert.equal(normalize(after),normalize(before),'only stable error names may change: '+path)}
 const originalDashboard=execFileSync('git',['show','b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a:src/server/clinical-dashboard/clinical-dashboard.service.ts'],{encoding:'utf8'}).replace('@/lib/demo/types','@/types/dashboard')
 assert.equal(readFileSync('src/server/clinical-dashboard/clinical-dashboard.service.ts','utf8'),originalDashboard,'dashboard queries and authorization must be unchanged')
 const changed=execFileSync('git',['diff','--name-only','b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a','--','src/server'],{encoding:'utf8'}).trim().split('\n').filter(Boolean)
 for(const path of changed)assert.ok(['src/server/clinical-dashboard/clinical-dashboard.service.ts','src/server/email/email-config.ts','src/server/email/local-demo-mail.ts','src/server/http/clinical-api-response.ts',...errorPaths].includes(path),path)
})
test('all showcase server leaves retain explicit commercial guard before mounting Premium and query rejection',()=>{
 for(const path of ['src/app/(showcase)/vitrine/layout.tsx','src/app/(showcase)/vitrine/page.tsx','src/app/(showcase)/vitrine/[section]/page.tsx','src/app/(showcase)/vitrine/pacientes/[id]/page.tsx']){
  const text=readFileSync(path,'utf8');assert.ok(text.includes('await requireCommercialPageSession()'),path);if(!path.endsWith('/layout.tsx'))assert.ok(text.includes('notFound()'),path)
 }
 assert.ok(readFileSync(root+'components/pacientes/DemoPatientView.tsx','utf8').includes('notFound()'))
 assert.ok(readFileSync(root+'lib/demo/welcome-session.ts','utf8').includes('pap.vitrine.premium.welcome.v2'))
})
