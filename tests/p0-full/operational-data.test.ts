import { test,before,after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { verifiedLoginFixture } from "../first-access/login-fixtures";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { actor,request } from "../mission04-b/fixtures";
import { ownProfile,profileName } from "../../src/server/account/own-profile.service";
import { clinicalDashboard } from "../../src/server/clinical-dashboard/clinical-dashboard.service";
import { createSession } from "../../src/server/auth/session.service";
import { createEncounter,startEncounter,completeEncounter } from "../../src/server/encounters/encounter.service";
import { GET,PATCH } from "../../src/app/api/account/profile/route";
async function professional(){const f=await verifiedLoginFixture();await db.roleAssignment.deleteMany({where:{userId:f.user.id}});await db.membership.create({data:{userId:f.user.id,organizationId:f.unit.id,status:"ACTIVE"}});await assignSystemRole({userId:f.user.id,organizationId:f.unit.id,roleKey:"PROFESSIONAL"});return {...f,token:f.verified.sessionToken};}
before(async()=>{assert.equal(new URL(process.env.DATABASE_URL!).pathname,"/pap_p0_full_tests");await bootstrapSystemIam();});after(()=>db.$disconnect());
test("own profile persists after reload, isolates two identities and forbids every non-allowlisted field",async()=>{
 const a=await actor(),b=await actor();for(const extra of [{email:"other@synthetic.invalid"},{userId:b.user.id},{role:"PAP_ADMIN"},{professionalRegistration:"123"},{isActive:false}])assert.throws(()=>profileName({displayName:"Pessoa",...extra}));
 for(const name of ["", "x","a\nname","x".repeat(121)])assert.throws(()=>profileName({displayName:name}));
 await ownProfile(a.token,{displayName:"Nome sintético atualizado"});assert.equal((await ownProfile(a.token)).displayName,"Nome sintético atualizado");assert.notEqual((await ownProfile(b.token)).displayName,"Nome sintético atualizado");assert.equal((await ownProfile(a.token)).email,a.user.email);assert.equal(await db.auditEvent.count({where:{actorUserId:a.user.id,action:"OWN_PROFILE_UPDATED"}}),1);
 const primary=await createSession({userId:a.user.id});await assert.rejects(ownProfile(primary.token,{displayName:"Negado"}));assert.equal((await ownProfile(a.token)).displayName,"Nome sintético atualizado");
 assert.equal((await GET(request("/api/account/profile"))).status,401);assert.equal((await PATCH(request("/api/account/profile",a.token,{displayName:"Negado"},"PATCH",{origin:"https://foreign.invalid"}))).status,403);assert.equal((await PATCH(request("/api/account/profile",a.token,{displayName:"Negado",email:"other@synthetic.invalid"},"PATCH"))).status,400);
});
test("dashboard counts only authorized units, deduplicates shared patients and filters completed series by state",async()=>{
 const a=await professional(),b=await professional();
 const shared=await db.patient.create({data:{fullName:"Paciente sintética compartilhada",birthDate:new Date("1995-01-01"),organizations:{create:[{organizationId:a.unit.id},{organizationId:b.unit.id}]},pregnancies:{create:{status:"ACTIVE",activeSlot:1}}}});
 const hidden=await db.patient.create({data:{fullName:"Paciente sintética privada B",birthDate:new Date("1995-01-01"),organizations:{create:{organizationId:b.unit.id}},pregnancies:{create:{status:"ACTIVE",activeSlot:1}}}});
 const e=await createEncounter({patientId:shared.id,organizationId:a.unit.id});await startEncounter(e.id);await completeEncounter(e.id);
 const busy=await createEncounter({patientId:hidden.id,organizationId:b.unit.id});await startEncounter(busy.id);
 const d=await clinicalDashboard(a.token);assert.deepEqual(d.kpis.map(x=>x.value),["1","1","1","0"]);assert.equal(d.monthly.reduce((n,m)=>n+m.total,0),1);assert.equal(d.recent.length,1);assert.equal(d.recent[0].id,e.id);assert.equal(d.recent[0].classification,null);assert.equal(d.recent[0].score,null);assert.deepEqual(d.risks,[]);assert.ok(!JSON.stringify(d).includes(hidden.fullName));assert.ok(d.kpis.every(k=>!k.trend));
 await db.membership.create({data:{userId:a.user.id,organizationId:b.unit.id,status:"ACTIVE"}});await assignSystemRole({userId:a.user.id,organizationId:b.unit.id,roleKey:"PROFESSIONAL"});assert.deepEqual((await clinicalDashboard(a.token)).kpis.map(x=>x.value),["2","2","1","1"]);
 await db.membership.updateMany({where:{userId:a.user.id,organizationId:b.unit.id},data:{status:"SUSPENDED"}});assert.equal((await clinicalDashboard(a.token)).kpis[0].value,"1");
});
test("empty scope has real zeroes and no fabricated comparisons; Admin and Commercial have no implicit clinical data",async()=>{
 const f=await professional();const d=await clinicalDashboard(f.token);assert.ok(d.kpis.every(k=>k.value==="0"&&!k.trend));assert.deepEqual(d.recent,[]);assert.ok(d.monthly.every(m=>m.total===0));await assert.rejects(clinicalDashboard((await actor()).token));await assert.rejects(clinicalDashboard((await actor("COMMERCIAL")).token));
});
