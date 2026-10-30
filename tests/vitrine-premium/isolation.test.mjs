import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const root='src/features/vitrine-premium/'
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+e.name+'/'):[dir+e.name])}
test('accessibility styles stay inside synthetic surfaces and cannot import external assets',()=>{
 const css=readFileSync(root+'accessibility.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'')
 assert.doesNotMatch(css,/@import|\burl\s*\(/i)
 for(const [,header]of css.matchAll(/([^{}]+)\{/g)){
  const selector=header.trim();if(selector.startsWith('@media'))continue
  let depth=0,branch='';const branches=[]
  for(const char of selector){if(char==='('||char==='[')depth++;if(char===')'||char===']')depth--;if(char===','&&depth===0){branches.push(branch.trim());branch=''}else branch+=char}
  branches.push(branch.trim())
  for(const item of branches)assert.match(item,/^(?:\.dark )?(?::is\(\[data-vitrine-premium\],\[data-vitrine-dialog\]\)|\[data-vitrine-premium\])(?:\s|\[|$)/,'unscoped synthetic style')
 }
})
test('Premium runtime dependency graph never imports operational code, database or clinical APIs',()=>{
 for(const path of files(root)){
  const text=readFileSync(path,'utf8');assert.ok(!/\bfetch\s*\(|\/api\/|@\/server\/|@\/lib\/clinical|prisma|postgresql:\/\//i.test(text),path)
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](@\/[^'"]+)/g))assert.ok(match[1].startsWith('@/features/vitrine-premium/')||['@/components/premium/HelpCard','@/components/premium/RouteHero','@/components/premium/premium.css'].includes(match[1]),`${path}: ${match[1]}`)
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
 const paths=['prisma','src/app/api','src/server/auth','src/server/iam','src/server/clinical','src/server/clinical-registration','src/server/vital-signs','src/server/obstetric-data','src/server/clinical-revision','src/server/meows','src/lib/clinical-api','src/lib/meows.ts','src/app/globals.css','package-lock.json','tsconfig.json','src/app/(auth)','Dockerfile','src/app/(showcase)']
 for(const path of paths)assert.equal(execFileSync('git',['diff','b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a','--',path],{encoding:'utf8'}),'',path)
 // Beta1 authorizes only shell/banner/help/sidebar presentation changes in these three files.
 // Synthetic models, fixtures, scoring, views, route guards and all other behavior stay frozen.
 // Exact prior accessibility additions only. Synthetic models, fixtures, scoring,
 // routing and behavior remain byte-identical to the approved baseline.
 const additions=new Map([
  [root+'components/layout/Sidebar.tsx',[["  useEffect(()=>{\n    const desktop=matchMedia('(min-width:768px)')\n    const closeOnDesktop=()=>{if(desktop.matches&&open)onClose()}\n    closeOnDesktop();desktop.addEventListener('change',closeOnDesktop)\n    return()=>desktop.removeEventListener('change',closeOnDesktop)\n  },[open,onClose])\n",'']]],
  [root+'components/layout/DashboardShell.tsx',[["import '@/features/vitrine-premium/accessibility.css'\n",'']]],
  [root+'components/ui/Modal.tsx',[[" data-vitrine-dialog",'']]],
  [root+'components/pacientes/PatientList.tsx',[["          aria-label=\"Buscar pacientes demonstrativos\"\n",''],['<p role="status" className="text-sm font-medium text-slate-600">','<p className="text-sm font-medium text-slate-600">']]],
  [root+'components/cursos/CourseList.tsx',[["          aria-label=\"Status dos cursos demonstrativos\"\n",'']]],
  [root+'components/chat/ChatHeader.tsx',[["        disabled\n        aria-label=\"Opções extras indisponíveis na demonstração\"\n        title=\"Recurso demonstrativo indisponível\"\n",'']]],
  [root+'components/ui/Input.tsx',[["  useId,\n",''],["    const generatedId = useId(), inputId = id ?? generatedId\n",''],['htmlFor={inputId}','htmlFor={id}'],['id={inputId}','id={id}']]],
  [root+'views/chat.tsx',[["<><h1 className=\"sr-only\">Chat IA demonstrativo</h1><ChatLayout",'<ChatLayout'],['/></>','/>']]],
 ])
 const featureFiles=execFileSync('git',['ls-files',root],{encoding:'utf8'}).trim().split('\n').filter(Boolean)
 const newStyle=root+'accessibility.css',known=new Set([...featureFiles,newStyle])
 for(const path of files(root))assert.ok(known.has(path),'unexpected synthetic file: '+path)
 for(const path of featureFiles){
  if(path===newStyle||[root+'components/layout/Sidebar.tsx',root+'components/layout/DashboardShell.tsx',root+'components/layout/sidebar.module.css'].includes(path))continue
  const before=execFileSync('git',['show',`b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a:${path}`],{encoding:'utf8'})
  let after=readFileSync(path,'utf8')
  for(const [added,original]of additions.get(path)||[])after=after.replace(added,original)
  assert.equal(after,before,'unapproved synthetic change: '+path)
 }
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
