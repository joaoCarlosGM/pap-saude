import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const root='src/features/vitrine-premium/'
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+e.name+'/'):[dir+e.name])}
const navigationPath='src/server/auth/login-navigation.service.ts';
// Closed, byte-exact exception: only the approved post-MFA destination changes.
// All challenge/session/onboarding checks and all other auth files stay frozen.
function assertNavigationContract(current,baseline){
 const edits=[
  ['destination: "/admin" | "/dashboard" | "/primeiros-passos" | "/comercial" | "/aguardando-autorizacao";',
   'destination: "/admin" | "/admin/manager" | "/dashboard" | "/cursos" | "/primeiros-passos" | "/comercial" | "/aguardando-autorizacao";'],
  ['  // Effective permissions already intersect the canonical role catalogue,',
   '  const destination = accessDestination(profile);\n  // Effective permissions already intersect the canonical role catalogue,'],
  ['      !profile.permissions.includes(PERMISSIONS.PATIENT_READ))',
   '      !profile.permissions.includes(PERMISSIONS.PATIENT_READ) &&\n      destination !== "/cursos")'],
  ['  return {\n    view: "REDIRECT",\n    destination: profile.canAccessAdmin ? "/admin" : "/dashboard",\n  };',
   '  if (destination === "/login") return { view: "RESTRICTED" };\n  return {\n    view: "REDIRECT",\n    destination,\n  };'],
 ];
 let expected=baseline;
 for(const [before,after]of edits){assert.equal(expected.split(before).length,2,'unique approved navigation edit');expected=expected.replace(before,after);}
 assert.equal(current,expected,'only approved destination selection may differ from frozen auth');
}
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
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](@\/[^'"]+)/g))assert.ok(match[1].startsWith('@/features/vitrine-premium/')||['@/components/premium/HelpCard','@/components/premium/RouteHero','@/components/premium/premium.css','@/components/courses/CourseCatalog','@/components/courses/LessonBlockRenderer','@/lib/courses/schema','@/lib/courses/types'].includes(match[1]),`${path}: ${match[1]}`)
 }
})
test('no root operational route literal in synthetic components; only explicit Commercial return escapes namespace',()=>{
 for(const path of files(root)){
  const text=readFileSync(path,'utf8');assert.ok(!/["'`]\/(dashboard|pacientes|registro|atendimentos|chat|protocolos|cursos|ferramentas|configuracoes)(?:[\/"'`?])/.test(text),path)
 }
 assert.ok(readFileSync(root+'components/layout/Sidebar.tsx','utf8').includes('href="/comercial"'))
 assert.ok(readFileSync(root+'components/layout/DashboardShell.tsx','utf8').includes("next.pathname.startsWith('/vitrine/')"))
})
test('Beta1 preserves authentication, clinical contracts, KPIs and all historical migrations; LMS additions are isolated',()=>{
 const base='c7b1d755';
 const before=path=>execFileSync('git',['show',`${base}:${path}`],{encoding:'utf8'});
 const unchanged=['src/server/auth','src/server/clinical','src/server/clinical-registration','src/server/clinical-dashboard','src/server/vital-signs','src/server/obstetric-data','src/server/clinical-revision','src/server/encounters','src/server/patients','src/server/pregnancies','src/server/meows','src/lib/clinical-api','src/lib/meows.ts','src/app/globals.css','package-lock.json','tsconfig.json','Dockerfile','src/server/iam/authorization.service.ts','src/server/iam/effective-access-profile.service.ts','src/server/iam/bootstrap.service.ts','src/server/iam/role-assignment.service.ts','src/components/premium/ClinicalDashboardView.tsx'];
 for(const path of unchanged){
  if(path==='src/server/auth'){
   const historicalAuth=execFileSync('git',['ls-tree','-r','--name-only',base,'--',path],{encoding:'utf8'}).trim().split('\n');
   assert.deepEqual(files(path+'/').sort(),historicalAuth.sort(),'auth file inventory remains frozen');
   assert.equal(execFileSync('git',['diff',base,'--',path,`:(exclude)${navigationPath}`],{encoding:'utf8'}),'','all other authentication files');
   assertNavigationContract(readFileSync(navigationPath,'utf8'),before(navigationPath));
  }else assert.equal(execFileSync('git',['diff',base,'--',path],{encoding:'utf8'}),'',path);
 }
 const historical=execFileSync('git',['ls-tree','-r','--name-only',base,'--','prisma/migrations'],{encoding:'utf8'}).trim().split('\n');assert.equal(historical.filter(p=>p.endsWith('/migration.sql')).length,35);
 for(const path of historical)assert.equal(readFileSync(path,'utf8'),before(path),path);
 for(const path of execFileSync('git',['ls-tree','-r','--name-only',base,'--','src/app/api'],{encoding:'utf8'}).trim().split('\n'))assert.equal(readFileSync(path,'utf8'),before(path),path);
 const old=before('prisma/schema.prisma'),current=readFileSync('prisma/schema.prisma','utf8');
 const blocks=text=>new Map([...text.matchAll(/^(model|enum) (\w+) \{[\s\S]*?^\}/gm)].map(m=>[m[2],m[0]]));
 const baseline=blocks(old),updated=blocks(current),normalize=text=>text.replace(/^.*\b(?:Course|CourseVersion|CourseAsset|CoursePublication|CourseAudience|CourseAssignment|CourseEnrollment)\??(?:\[\])?.*$/gm,'').replace(/(invitationId String)\?/, '$1').replace(/(invitation AccessInvitation)\?/, '$1').replace(/^.*course(?:Enrollment|Publication)Id String\?.*$/gm,'').replace(/\s+/g,' ').trim();
 for(const [name,block]of baseline)assert.equal(normalize(updated.get(name)||''),normalize(block),`existing schema ${name}`);
 const newModels=[...updated.keys()].filter(n=>!baseline.has(n));assert.deepEqual(newModels.sort(),['Course','CourseVersion','CourseModule','CourseLesson','CourseAsset','CourseAssessment','CourseQuestion','CoursePublication','CourseAudience','CourseAssignment','CourseEnrollment','CourseProgress','CourseAttempt'].sort());
 const sql=readFileSync('prisma/migrations/20261030090000_beta1_courses_lms/migration.sql','utf8');
 for(const [,table]of sql.matchAll(/ALTER TABLE "?([a-z_]+)"?/g))assert.ok(table.startsWith('course_')||table==='courses'||table==='user_notifications',table);
 assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE FROM|INSERT INTO|TRUNCATE)\s+"?(?:users|sessions|mfa_factors|mfa_recovery_codes|patients|encounters|role_assignments)\b/i);
 const clean=text=>text.replace(/^.*(?:PERMISSIONS\.COURSE_|COURSE_\w+:|ORGANIZATION_MUNICIPALITY_CREATE|\/\/ Narrow delegated inclusion|\/\/ LMS:).*$/gm,'').replace(/\s+/g,' ').trim();
 for(const path of ['src/server/iam/permissions.ts','src/server/iam/system-role-catalog.ts'])assert.equal(clean(readFileSync(path,'utf8')),clean(before(path)),`existing IAM catalog ${path}`);
 const invitation='src/server/access-invitations/access-invitation.service.ts';assert.equal(readFileSync(invitation,'utf8').replace('!notice.invitation || ',''),before(invitation));
 const allowed=new Set(['src/server/iam/permissions.ts','src/server/iam/system-role-catalog.ts','src/server/notifications/notification.service.ts',invitation,'src/server/account/workspace-identity.service.ts','src/server/admin-beta/delegated-institutions.service.ts',navigationPath]);
 const changed=execFileSync('git',['diff','--name-only',base,'--','src/server'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 for(const path of changed)assert.ok(path.startsWith('src/server/courses/')||allowed.has(path),path);
 const syntheticCore=execFileSync('git',['ls-tree','-r','--name-only',base,'--',root+'lib/demo',root+'types'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 for(const path of syntheticCore)assert.equal(readFileSync(path,'utf8'),before(path),`synthetic core ${path}`);
 // New shared components remain pure. A shared renderer never acquires an API/data provider.
 for(const path of ['src/components/courses/CourseCatalog.tsx','src/components/courses/LessonBlockRenderer.tsx','src/lib/courses/types.ts','src/lib/courses/schema.ts'])assert.doesNotMatch(readFileSync(path,'utf8'),/\bfetch\s*\(|\/api\/|@\/server\/|@prisma|postgresql:\/\//i,path);
})
test('destination exception rejects challenge, MFA, session, onboarding, scope and write bypasses',()=>{
 const baseline=execFileSync('git',['show',`c7b1d755:${navigationPath}`],{encoding:'utf8'}),current=readFileSync(navigationPath,'utf8');
 assertNavigationContract(current,baseline);
 for(const [before,after]of [
  ['if (challengeToken)', 'if (false && challengeToken)'],
  ['await loadMfaChallenge(challengeToken)', 'Promise.resolve()'],
  ['await validateSession(sessionToken, { updateLastSeen: false })', 'await validateSession(sessionToken, { updateLastSeen: true })'],
  ['if (!state.verified)', 'if (false && !state.verified)'],
  ['state.progress?.status !== "COMPLETED"', 'false'],
  ['!profile.canAccessAdmin &&', 'false &&'],
  ['destination !== "/cursos"', 'destination !== "/dashboard"'],
  ['if (destination === "/login") return { view: "RESTRICTED" };',''],
 ]){
  assert.ok(current.includes(before),'security mutation targets an existing guard');
  assert.throws(()=>assertNavigationContract(current.replace(before,after),baseline));
 }
 assert.throws(()=>assertNavigationContract(current+'\nconsole.log(sessionToken);\n',baseline));
})
test('all showcase server leaves retain explicit commercial guard before mounting Premium and query rejection',()=>{
 for(const path of ['src/app/(showcase)/vitrine/layout.tsx','src/app/(showcase)/vitrine/page.tsx','src/app/(showcase)/vitrine/[section]/page.tsx','src/app/(showcase)/vitrine/pacientes/[id]/page.tsx','src/app/(showcase)/vitrine/aprender/[id]/page.tsx']){
  const text=readFileSync(path,'utf8');assert.ok(text.includes('await requireCommercialPageSession()'),path);if(!path.endsWith('/layout.tsx'))assert.ok(text.includes('notFound()'),path)
 }
 assert.ok(readFileSync(root+'components/pacientes/DemoPatientView.tsx','utf8').includes('notFound()'))
 assert.ok(readFileSync(root+'lib/demo/welcome-session.ts','utf8').includes('pap.vitrine.premium.welcome.v2'))
})
