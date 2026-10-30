import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {db} from '../../src/server/db/client';import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {actor,request} from '../mission04-b/fixtures';import {professional} from './fixtures';import {createSession} from '../../src/server/auth/session.service';
import * as http from '../../src/app/api/courses/[...segments]/route';
import {saveDraft,publishVersion,newVersion,getDraft} from '../../src/server/courses/authoring.service';
import {releaseCourse,withdrawPublication,editorDistribution} from '../../src/server/courses/publication.service';
import {assignCourse,availableCourses,unitProgress,municipalCourses} from '../../src/server/courses/assignment.service';
import {getEnrollment,myCourses,saveProgress,submitAttempt,courseBadge,markCoursesSeen} from '../../src/server/courses/progress.service';
import {draftSchema} from '../../src/lib/courses/schema';
before(async()=>{assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/pap_beta1_test');assert.equal(new URL(process.env.DATABASE_URL!).hostname,'127.0.0.1');await bootstrapSystemIam();});after(()=>db.$disconnect());
import {draft,scoped,graph} from './lms-fixtures';
const ctx=(path:string)=>({params:Promise.resolve({segments:path.split('/')})});
test('dedicated course API denies primary-only MFA, Commercial and professional authors; CSRF and raw HTML are rejected',async()=>{
 const m=await actor('PAP_MANAGER'),p=await professional(),c=await actor('COMMERCIAL'),primary=await createSession({userId:m.user.id});
 for(const [token,status]of [[primary.token,403],[p.token,403],[c.token,403]] as const)assert.equal((await http.POST(request('/api/courses/drafts',token,draft()),ctx('drafts'))).status,status);
 assert.equal((await http.POST(request('/api/courses/drafts',m.token,draft(),'POST',{origin:'https://untrusted.invalid'}),ctx('drafts'))).status,403);
 assert.equal(draftSchema.safeParse({...draft(),modules:[{title:'Unsafe',lessons:[{title:'Unsafe',estimatedMinutes:5,contentBlocks:[{id:'x',type:'rawHtml',html:'<script>alert(1)</script>'}]}]}]}).success,false);
 assert.equal(draftSchema.safeParse({...draft(),thumbnail:'javascript:alert(1)'}).success,false);

 const {readCourseJson}=await import('../../src/server/courses/read-json');let cancelled=false;
 const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(32769));},cancel(){cancelled=true;}});
 await assert.rejects(readCourseJson(new Request('http://127.0.0.1:3110',{method:'POST',headers:{'content-type':'application/json','content-length':'2'},body:stream,duplex:'half'} as RequestInit&{duplex:'half'})));assert.equal(cancelled,true);
 await assert.rejects(readCourseJson(new Request('http://127.0.0.1:3110',{method:'POST',headers:{'content-type':'application/json'},body:'[]'})));
 assert.deepEqual(await readCourseJson(new Request('http://127.0.0.1:3110',{method:'POST',headers:{'content-type':'application/json'},body:'{"ok":true}'})),{ok:true});
 assert.equal(await db.course.count(),0);
});
test('publication is idempotent, immutable in SQL and versioned; a foreign Manager cannot edit it',async()=>{
 const m=await actor('PAP_MANAGER'),foreign=await actor('PAP_MANAGER'),v=await saveDraft(m.token,draft());await assert.rejects(getDraft(foreign.token,v.id));
 const [a,b]=await Promise.all([publishVersion(m.token,v.id),publishVersion(m.token,v.id)]);assert.equal(a.publicationId,b.publicationId);await assert.rejects(saveDraft(m.token,{...draft(),revision:v.revision},v.id));
 const courseModule=await db.courseModule.findFirstOrThrow({where:{courseVersionId:v.id}}),lesson=await db.courseLesson.findFirstOrThrow({where:{moduleId:courseModule.id}});
 await assert.rejects(db.courseLesson.update({where:{id:lesson.id},data:{title:'Tamper'}}));await assert.rejects(db.courseLesson.create({data:{moduleId:courseModule.id,title:'Injection',sortOrder:20,contentBlocks:[]}}));
 const cloned=await newVersion(m.token,v.id);assert.equal(cloned.versionNo,2);assert.equal(cloned.publishedAt,null);assert.equal((await getDraft(m.token,v.id)).payload.title,draft().title);assert.equal(await db.auditEvent.count({where:{action:'COURSE_PUBLISHED',resourceId:a.publicationId}}),1);
});
test('draft optimistic concurrency never loses an edit or partially rewrites modules',async()=>{
 const m=await actor('PAP_MANAGER'),v=await saveDraft(m.token,draft());const results=await Promise.allSettled([saveDraft(m.token,{...draft(),title:'Edição A',revision:1},v.id),saveDraft(m.token,{...draft(),title:'Edição B',revision:1},v.id)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await getDraft(m.token,v.id)).revision,2);assert.equal(await db.courseLesson.count({where:{module:{courseVersionId:v.id}}}),2);
});
test('unit assignment is atomic/idempotent, emits one persistent notification, and denies foreign/inactive recipients and Manager self-assignment',async()=>{
 const g=await graph(),foreign=await professional(),body={publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,all:false,userIds:[g.learner.user.id],obligation:'REQUIRED',deadlineAt:null};
 await assert.rejects(assignCourse(g.manager.token,body));await assert.rejects(assignCourse(g.unit.token,{...body,userIds:[g.learner.user.id,foreign.user.id]}));assert.equal(await db.courseAssignment.count({where:{publicationId:g.pub.publicationId}}),0);
 const [a,b]=await Promise.all([assignCourse(g.unit.token,body),assignCourse(g.unit.token,body)]);assert.equal(a.assigned+b.assigned,1);const id=a.enrollmentIds[0];assert.equal(await db.courseEnrollment.count({where:{id}}),1);assert.equal(await db.userNotification.count({where:{userId:g.learner.user.id,kind:'COURSE_ASSIGNED_TO_USER',courseEnrollmentId:id}}),1);
 assert.equal((await courseBadge(g.learner.token)).newCourses,1);await assert.rejects(getEnrollment(foreign.token,id));await assert.rejects(unitProgress(g.unit.token,foreign.unit.id));
 await db.membership.update({where:{userId_organizationId:{userId:g.learner.user.id,organizationId:g.learner.unit.id}},data:{status:'SUSPENDED'}});await assert.rejects(getEnrollment(g.learner.token,id));await assert.rejects(courseBadge(g.learner.token));
});
test('learner sequence, checkpoint, server assessment and concurrent replay preserve authoritative progress without answer leakage',async()=>{
 const g=await graph(),a=await assignCourse(g.unit.token,{publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,all:true,obligation:'RECOMMENDED',deadlineAt:null}),id=a.enrollmentIds[0];let view=await getEnrollment(g.learner.token,id);
 await assert.rejects(getEnrollment(g.learner.token,id+"' OR '1'='1"));assert.equal(await db.courseEnrollment.count({where:{id}}),1);assert.equal(JSON.stringify(view).includes('correctIndex'),false);assert.equal(JSON.stringify(view).includes('expected'),false);const [one,two]=view.modules[0].lessons;
 await assert.rejects(saveProgress(g.learner.token,id,{lessonId:two.id,revision:0,action:'COMPLETE',acknowledged:true,answers:{}}));
 await assert.rejects(saveProgress(g.learner.token,id,{lessonId:one.id,revision:0,action:'COMPLETE',acknowledged:true,answers:{check:1}}));assert.equal(await db.courseProgress.count({where:{enrollmentId:id}}),0);
 const complete={lessonId:one.id,revision:0,action:'COMPLETE',acknowledged:true,answers:{check:0}};const results=await Promise.all([saveProgress(g.learner.token,id,complete),saveProgress(g.learner.token,id,complete)]);assert.equal(results[0].progress,50);assert.equal(results[1].progress,50);assert.equal(await db.courseProgress.count({where:{enrollmentId:id}}),1);
 view=await getEnrollment(g.learner.token,id);assert.equal(view.lastLessonId,one.id);view=await saveProgress(g.learner.token,id,{lessonId:two.id,revision:view.revision,action:'COMPLETE',acknowledged:true,answers:{}});assert.equal(view.progress,100);assert.equal(view.completedAt,null);
 const q=view.assessment!.questions[0];const requestKey=randomUUID();const final=await Promise.all([submitAttempt(g.learner.token,id,{requestKey,answers:{[q.id]:0}}),submitAttempt(g.learner.token,id,{requestKey,answers:{[q.id]:0}})]);assert.ok(final[0].completedAt);assert.equal(final[1].attempts.length,1);assert.equal(final[0].certificationAvailable,false);assert.equal(await db.auditEvent.count({where:{action:'COURSE_COMPLETED',resourceId:id}}),1);
 assert.equal((await myCourses(g.learner.token))[0].status,'COMPLETED');assert.equal((await unitProgress(g.unit.token,g.learner.unit.id))[0].status,'COMPLETED');assert.equal((await unitProgress(g.unit.token,g.learner.unit.id,1,{status:'PENDING'})).length,0);assert.equal((await unitProgress(g.unit.token,g.learner.unit.id,1,{name:'not-a-team-member'})).length,0);await assert.rejects(unitProgress(g.unit.token,g.learner.unit.id,1,{status:'UNKNOWN'}));
});
test('municipality release enables only eligible descendants and still never auto-enrolls; publication revocation denies next request',async()=>{
 const g=await graph(),municipal=await scoped('MUNICIPAL_ADMIN',g.learner.unit.parentId!),foreign=await professional();
 await assert.rejects(releaseCourse(municipal.token,g.pub.publicationId,{organizationIds:[foreign.unit.id]},true));await releaseCourse(g.manager.token,g.pub.publicationId,{organizationIds:[g.learner.unit.parentId!]});assert.equal(await db.courseEnrollment.count({where:{courseVersionId:g.v.id}}),0);const overview=await municipalCourses(municipal.token,g.learner.unit.parentId!);assert.equal(overview.units.find(u=>u.id===g.learner.unit.id)?.progress.suppressed,true);await assert.rejects(municipalCourses(municipal.token,foreign.unit.parentId!));assert.ok((await editorDistribution(g.manager.token)).some(p=>p.id===g.pub.publicationId));const otherManager=await actor('PAP_MANAGER');assert.equal((await editorDistribution(otherManager.token)).length,0);
 assert.ok((await availableCourses(g.unit.token,g.learner.unit.id)).some(p=>p.id===g.pub.publicationId));await assert.rejects(availableCourses(g.unit.token,foreign.unit.id));
 const assigned=await assignCourse(g.unit.token,{publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,all:true,obligation:'OPTIONAL',deadlineAt:null});await withdrawPublication(g.manager.token,g.pub.publicationId,'REVOKE');await assert.rejects(getEnrollment(g.learner.token,assigned.enrollmentIds[0]));
});
test('draft creation key survives lost responses and concurrent replay without duplicate courses',async()=>{
 const manager=await actor('PAP_MANAGER'),requestKey=randomUUID(),payload={...draft(),requestKey};const [a,b]=await Promise.all([saveDraft(manager.token,payload),saveDraft(manager.token,payload)]);assert.equal(a.id,b.id);assert.equal(await db.course.count({where:{creationKey:requestKey}}),1);await assert.rejects(saveDraft(manager.token,{...payload,title:'Changed replay'}));assert.equal(await db.auditEvent.count({where:{resourceId:a.id,action:'COURSE_DRAFT_SAVED'}}),1);
});
test('deadline notifications and unit revocation are persistent, deduplicated and never erase progress',async()=>{
 const {syncDeadlineNotifications}=await import('../../src/server/courses/progress.service'),{revokeAssignment}=await import('../../src/server/courses/assignment.service');const g=await graph(),deadlineAt=new Date(Date.now()+2*86400000).toISOString(),assigned=await assignCourse(g.unit.token,{publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,all:true,obligation:'REQUIRED',deadlineAt}),id=assigned.enrollmentIds[0];
 await syncDeadlineNotifications(g.learner.token);await syncDeadlineNotifications(g.learner.token);assert.equal(await db.userNotification.count({where:{courseEnrollmentId:id,kind:'COURSE_DEADLINE_APPROACHING'}}),1);
 await db.courseAssignment.update({where:{publicationId_organizationId_professionalUserId:{publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,professionalUserId:g.learner.user.id}},data:{deadlineAt:new Date(Date.now()-1000)}});await syncDeadlineNotifications(g.learner.token);assert.equal((await getEnrollment(g.learner.token,id)).status,'OVERDUE');assert.equal(await db.userNotification.count({where:{courseEnrollmentId:id,kind:'COURSE_OVERDUE'}}),1);
 await revokeAssignment(g.unit.token,id);await revokeAssignment(g.unit.token,id);await markCoursesSeen(g.learner.token);assert.equal((await db.courseEnrollment.findUniqueOrThrow({where:{id}})).seenAt,null);assert.equal((await db.userNotification.findFirstOrThrow({where:{courseEnrollmentId:id,kind:'COURSE_ASSIGNED_TO_USER'}})).readAt,null);assert.equal((await courseBadge(g.learner.token)).newCourses,0);assert.equal(await db.userNotification.count({where:{courseEnrollmentId:id,kind:'COURSE_ASSIGNMENT_REVOKED'}}),1);await assert.rejects(getEnrollment(g.learner.token,id));assert.equal(await db.courseEnrollment.count({where:{id}}),1);
});
test('server counts assessment attempts and pins enrollment to its immutable original version',async()=>{
 const g=await graph(),assigned=await assignCourse(g.unit.token,{publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,all:true,obligation:'OPTIONAL',deadlineAt:null}),id=assigned.enrollmentIds[0];let e=await getEnrollment(g.learner.token,id);for(const lesson of e.modules.flatMap(m=>m.lessons)){e=await saveProgress(g.learner.token,id,{lessonId:lesson.id,revision:e.revision,action:'COMPLETE',acknowledged:true,answers:lesson.contentBlocks.some(b=>b.id==='check')?{check:0}:{}});}
 const question=e.assessment!.questions[0],key=randomUUID();await submitAttempt(g.learner.token,id,{requestKey:key,answers:{[question.id]:1}});await submitAttempt(g.learner.token,id,{requestKey:key,answers:{[question.id]:1}});assert.equal(await db.courseAttempt.count({where:{enrollmentId:id}}),1);await submitAttempt(g.learner.token,id,{requestKey:randomUUID(),answers:{[question.id]:1}});await assert.rejects(submitAttempt(g.learner.token,id,{requestKey:randomUUID(),answers:{[question.id]:0}}));assert.equal((await getEnrollment(g.learner.token,id)).completedAt,null);
 const next=await newVersion(g.manager.token,g.v.id),newLesson=await db.courseLesson.findFirstOrThrow({where:{module:{courseVersionId:next.id}}});await assert.rejects(saveProgress(g.learner.token,id,{lessonId:newLesson.id,revision:e.revision,action:'VISIT',answers:{}}));assert.equal((await getEnrollment(g.learner.token,id)).versionNo,1);
});
test('concurrent role revocation waits for the authorized write; all requests after confirmed revocation fail closed',{timeout:30000},async()=>{
 const manager=await actor('PAP_MANAGER');let release!:()=>void,held!:()=>void;const gate=new Promise<void>(r=>release=r),locked=new Promise<void>(r=>held=r);
 await db.$executeRawUnsafe(`CREATE FUNCTION beta1_test_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(421905); RETURN NEW; END $$`);await db.$executeRawUnsafe(`CREATE TRIGGER beta1_test_pause BEFORE INSERT ON courses FOR EACH ROW EXECUTE FUNCTION beta1_test_pause()`);
 const holder=db.$transaction(async tx=>{await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(421905)`;held();await gate;},{timeout:15000});await locked;
 const saving=saveDraft(manager.token,draft());let revoke:Promise<unknown>|undefined;
 async function waitFor(check:()=>Promise<boolean>){for(let i=0;i<100;i++){if(await check())return;await new Promise(r=>setTimeout(r,20));}assert.fail('Expected PostgreSQL lock was not observed');}
 try{
  await waitFor(async()=>{const rows=await db.$queryRaw<{waiting:boolean}[]>`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND objid=421905 AND NOT granted) AS waiting`;return rows[0].waiting;});
  revoke=db.$transaction(async tx=>{await tx.$queryRaw`SELECT set_config('application_name','beta1_test_revocation',true)`;await tx.roleAssignment.deleteMany({where:{userId:manager.user.id}});},{timeout:15000});
  await waitFor(async()=>{const rows=await db.$queryRaw<{waiting:boolean}[]>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='beta1_test_revocation' AND wait_event_type='Lock') AS waiting`;return rows[0].waiting;});
  release();await holder;const saved=await saving;await revoke;assert.ok(saved.id);const count=await db.course.count();await assert.rejects(saveDraft(manager.token,draft()));assert.equal(await db.course.count(),count);
 }finally{release();await Promise.allSettled([holder,saving,...(revoke?[revoke]:[])]);await db.$executeRawUnsafe('DROP TRIGGER beta1_test_pause ON courses');await db.$executeRawUnsafe('DROP FUNCTION beta1_test_pause()');}
});

test('partial drafts persist safely but publishing requires every content field and never creates a partial publication',async()=>{
 const manager=await actor('PAP_MANAGER'),payload=draft();payload.title='';payload.description='';payload.modules[0].lessons[0].contentBlocks[0]={id:'intro',type:'text',text:''};const saved=await saveDraft(manager.token,payload);assert.equal((await getDraft(manager.token,saved.id)).payload.title,'');await assert.rejects(publishVersion(manager.token,saved.id));assert.equal(await db.coursePublication.count({where:{courseVersionId:saved.id}}),0);assert.equal((await getDraft(manager.token,saved.id)).publishedAt,null);
});
test('delegated municipal inclusion requires its own global grant and MFA, stays pending and cannot activate a unit or escalate roles',async()=>{
 const {createDelegatedMunicipality,inclusionParents}=await import('../../src/server/admin-beta/delegated-institutions.service'),{authorize}=await import('../../src/server/iam/authorization.service'),route=await import('../../src/app/api/admin/manager/municipalities/route');const manager=await actor('PAP_MANAGER'),commercial=await actor('COMMERCIAL'),prof=await professional(),parent=(await inclusionParents(manager.token))[0];assert.ok(parent);
 const code=String(Math.floor(1000000+Math.random()*9000000)),body={parentId:parent.id,name:'Município sintético de inclusão',code,city:'Município sintético',state:'PA'};
 for(const token of [commercial.token,prof.token,(await createSession({userId:manager.user.id})).token])assert.equal((await route.POST(request('/api/admin/manager/municipalities',token,body))).status,403);
 assert.equal((await route.POST(request('/api/admin/manager/municipalities',manager.token,body,'POST',{origin:'https://untrusted.invalid'}))).status,403);
 assert.equal((await route.POST(request('/api/admin/manager/municipalities',manager.token,{...body,status:'ACTIVE'}))).status,400);
 await assert.rejects(createDelegatedMunicipality(manager.token,{...body,parentId:prof.unit.id}));
 const [a,b]=await Promise.all([createDelegatedMunicipality(manager.token,body),createDelegatedMunicipality(manager.token,body)]);assert.equal(a.id,b.id);const org=await db.organization.findUniqueOrThrow({where:{id:a.id}});assert.equal(org.status,'PENDING_VERIFICATION');assert.equal(org.isActive,false);assert.equal(await db.auditEvent.count({where:{resourceId:org.id,action:'DELEGATED_MUNICIPALITY_CREATED'}}),1);assert.equal(await db.roleAssignment.count({where:{organizationId:org.id}}),0);
 for(const permission of ['organization.manage','organization.activate','organization.delete','patient.read'] as const)assert.equal((await authorize({userId:manager.user.id,permission,organizationId:org.id})).allowed,false);
 await assert.rejects(createDelegatedMunicipality(manager.token,{...body,name:'Changed retry'}));
});
