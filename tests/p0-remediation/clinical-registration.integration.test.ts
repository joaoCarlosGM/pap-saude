import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createVerifiedSession as createSession } from "../helpers/verified-session";
import { createClinicalRegistrationService, clinicalRegistrationService, RegistrationOperationError, type RegistrationStage } from "../../src/server/clinical-registration/registration.service";
import * as route from "../../src/app/api/clinical/registrations/route";
import type { RegistrationData } from "../../src/types/registration";

const origin = "http://127.0.0.1:3118";
const valid = (): RegistrationData => ({ cpf: "", nomeCompleto: `Pessoa sintética ${randomUUID()}`, dataNascimento: "1990-01-01", primeiroAtendimento: true, dum: "2026-01-01", paSistolica: "120", paDiastolica: "80", frequenciaCardiaca: "90", frequenciaRespiratoria: "16", temperatura: "36.5", saturacaoO2: "98", nivelConsciencia: "ALERT", debitoUrinario: "", proteinuria: "", alturaUterina: "30", bcf: "140", movimentacaoFetal: "true", edema: "NONE", sangramentoVaginal: "false", pesoAtual: "65", queixasPrincipais: "", observacoesProfissional: "" });
async function actor(role: "PROFESSIONAL" | "COMMERCIAL" | "PAP_ADMIN" = "PROFESSIONAL") {
 const user = await db.user.create({ data: { email: `${randomUUID()}@synthetic.invalid`, displayName: "Pessoa sintética" } });
 const pap = await db.organization.create({ data: { name: "PAP sintético", type: "PAP", status: "ACTIVE" } });
 const city = await db.organization.create({ data: { name: "Município sintético", type: "MUNICIPALITY", status: "ACTIVE", parentId: pap.id } });
 const unit = await db.organization.create({ data: { name: "UBS sintética", type: "HEALTH_UNIT", status: "ACTIVE", parentId: city.id } });
 await db.membership.create({ data: { userId: user.id, organizationId: unit.id, status: "ACTIVE" } });
 await assignSystemRole({ userId: user.id, roleKey: role, ...(role === "PROFESSIONAL" ? { organizationId: unit.id } : {}) });
 const session = await createSession({ userId: user.id });
 return { user, unit, session, identity: { sessionToken: session.token, organizationId: unit.id, operationKey: randomUUID() } };
}
async function graph() {
 return { provenance: await db.clinicalProvenanceEvent.count(), patient: await db.patient.count(), links: await db.patientOrganization.count(), pregnancy: await db.pregnancy.count(), encounter: await db.encounter.count(), vitals: await db.vitalSigns.count(), obstetric: await db.obstetricData.count(), evaluation: await db.clinicalEvaluation.count(), operation: await db.clinicalRegistrationOperation.count(), activity: await db.productActivityEvent.count(), success: await db.auditEvent.count({ where: { action: "CLINICAL_REGISTRATION_COMPLETED" } }) };
}
function request(f: Awaited<ReturnType<typeof actor>>, method: string, body?: unknown, extras: Record<string,string> = {}) {
 return new NextRequest(origin + "/api/clinical/registrations", { method, headers: { cookie: `pap_session=${f.identity.sessionToken}`, origin, "content-type": "application/json", "x-organization-id": f.unit.id, "idempotency-key": f.identity.operationKey, ...extras }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
before(async () => {
 const u = new URL(process.env.DATABASE_URL!); assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "25443"); assert.equal(u.pathname, "/pap_p0_registration_test");
 const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`; assert.equal(rows[0].name, "pap_p0_registration_test");
 await bootstrapSystemIam();
});
after(() => db.$disconnect());

for (const stage of ["AUTHORIZED", "CLAIMED", "PATIENT", "PREGNANCY", "ENCOUNTER", "STARTED", "VITALS", "OBSTETRICS", "EVALUATED", "COMPLETED", "FINALIZED"] as RegistrationStage[]) {
 test(`interruption after ${stage} rolls back the entire clinical graph and retry safely completes once`, async () => {
  const f = await actor(), payload = valid(), initial = await graph();
  const broken = createClinicalRegistrationService({ afterStage: async at => { if (at === stage) throw new Error("SYNTHETIC_INTERRUPTION"); } });
  await assert.rejects(broken.submit({ ...f.identity, payload }));
  assert.deepEqual(await graph(), initial);
  const failure = await db.auditEvent.findFirstOrThrow({ where: { actorUserId: f.user.id, action: "CLINICAL_REGISTRATION_FAILED" } });
  assert.equal((failure.metadata as Record<string,unknown>).stage, stage);
  assert.equal((failure.metadata as Record<string,unknown>).writeOutcome, "UNCONFIRMED");
  assert.equal(JSON.stringify(failure).includes(payload.nomeCompleto), false);
  const result = await clinicalRegistrationService.submit({ ...f.identity, payload });
  assert.equal(result.status, "COMPLETED"); assert.equal(result.replayed, false);
  const replay = await clinicalRegistrationService.submit({ ...f.identity, payload });
  assert.equal(replay.replayed, true); assert.deepEqual(replay.registration, result.registration);
  assert.equal((await db.encounter.findUniqueOrThrow({ where: { id: result.registration.encounterId } })).status, "COMPLETED");
  assert.equal(result.registration.meows.protocolStatus, "DRAFT_UNVALIDATED"); assert.equal(result.registration.meows.clinicallyValidated, false); assert.equal(result.registration.meows.meowsScore, null); assert.equal(result.registration.meows.alertLevel, null);
  const final = await graph();
  for (const key of Object.keys(final) as (keyof typeof final)[]) assert.equal(final[key], initial[key] + (key === "provenance" ? 2 : 1), key);
 });
}

test("concurrent same-key submissions create exactly one graph, result, completion audit and activity", async () => {
 const f = await actor(), payload = valid(), initial = await graph();
 const results = await Promise.all(Array.from({ length: 6 }, () => clinicalRegistrationService.submit({ ...f.identity, payload })));
 assert.equal(results.filter(r => !r.replayed).length, 1);
 assert.equal(new Set(results.map(r => r.registration.encounterId)).size, 1);
 const final = await graph(); for (const key of Object.keys(final) as (keyof typeof final)[]) assert.equal(final[key], initial[key]+(key === "provenance" ? 2 : 1), key);
});
test("same-key different payload is a conflict and cannot alter the original record", async () => {
 const f = await actor(), payload = valid();const first = await clinicalRegistrationService.submit({ ...f.identity, payload });const before = await graph();
 await assert.rejects(clinicalRegistrationService.submit({ ...f.identity, payload: { ...payload, nomeCompleto: "Outro nome sintético" } }), (e: unknown) => e instanceof RegistrationOperationError && e.status===409);
 assert.deepEqual(await graph(), before);assert.equal((await db.patient.findUniqueOrThrow({ where: { id: first.registration.patientId } })).fullName,payload.nomeCompleto);
});
test("HTTP response lost after COMMIT is recovered through GET and repeated POST without duplication", async () => {
 const f = await actor(), payload = valid();const first = await route.POST(request(f, "POST", payload));assert.equal(first.status,201);
 // The first response is deliberately discarded as if the transport disappeared.
 const before = await graph();const state = await route.GET(request(f,"GET"));assert.equal(state.status,200);const recovered=await state.json();assert.equal(recovered.status,"COMPLETED");
 const repeat=await route.POST(request(f,"POST",payload));assert.equal(repeat.status,200);assert.equal((await repeat.json()).registration.encounterId,recovered.registration.encounterId);assert.deepEqual(await graph(),before);
});
test("interactive transaction timeout leaves no partial graph and same-key retry remains valid", async () => {
 const f=await actor(),payload=valid(),initial=await graph();
 let reached=false;
 const timed=createClinicalRegistrationService({ transactionTimeoutMs:1000, afterStage: async stage => { if(stage==="PATIENT") { reached=true; await new Promise(resolve=>setTimeout(resolve,1200)); } } });
 await assert.rejects(timed.submit({...f.identity,payload}));assert.deepEqual(await graph(),initial);
 assert.equal(reached,true,"timeout must interrupt after a real patient write inside the transaction");
 const retry=await clinicalRegistrationService.submit({...f.identity,payload});assert.equal(retry.status,"COMPLETED");
});
test("cancel tombstone rejects a late original POST and survives repeated cancellation", async () => {
 const f=await actor(),payload=valid(),initial=await graph();
 assert.deepEqual(await clinicalRegistrationService.status(f.identity),{status:"NOT_FOUND"});
 assert.deepEqual(await clinicalRegistrationService.cancel(f.identity),{status:"CANCELLED"});
 assert.deepEqual(await clinicalRegistrationService.cancel(f.identity),{status:"CANCELLED"});
 await assert.rejects(clinicalRegistrationService.submit({...f.identity,payload}), (e:unknown)=>e instanceof RegistrationOperationError && e.code==="REGISTRATION_OPERATION_CANCELLED");
 const final=await graph();assert.deepEqual(final,{...initial,operation:initial.operation+1});
});
test("cancel racing an already claimed POST returns the committed result and cannot delete it", async () => {
 const f=await actor(),payload=valid();let signal!:()=>void;const claimed=new Promise<void>(r=>signal=r);let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const slow=createClinicalRegistrationService({afterStage:async stage=>{if(stage==="CLAIMED"){signal();await gate;}}});
 const submit=slow.submit({...f.identity,payload});await claimed;const cancel=clinicalRegistrationService.cancel(f.identity);release();const result=await submit;const cancelled=await cancel;
 assert.equal(cancelled.status,"COMPLETED");if(cancelled.status==="COMPLETED")assert.equal(cancelled.registration.encounterId,result.registration.encounterId);
});
test("invalid payload and unknown fields fail before any graph write", async()=>{
 const f=await actor(),payload=valid(),initial=await graph();
 for(const body of [{...payload,paSistolica:""},{...payload,temperatura:"NaN"},{...payload,organizationId:f.unit.id},{...payload,primeiroAtendimento:"true"}]) assert.equal((await route.POST(request(f,"POST",body))).status,400);
 assert.deepEqual(await graph(),initial);
});
test("CSRF, missing identity headers, queries and oversized bodies fail closed", async()=>{
 const f=await actor(),payload=valid(),initial=await graph();
 assert.equal((await route.POST(request(f,"POST",payload,{origin:"https://untrusted.invalid"}))).status,403);
 assert.equal((await route.DELETE(request(f,"DELETE",undefined,{origin:"https://untrusted.invalid"}))).status,403);
 assert.equal((await route.POST(request(f,"POST",payload,{"idempotency-key":""}))).status,400);
 assert.equal((await route.POST(request(f,"POST",payload,{cookie:""}))).status,401);
 assert.equal((await route.POST(request(f,"POST",{...payload,padding:"x".repeat(70000)}))).status,400);
 assert.equal((await route.GET(new NextRequest(origin+"/api/clinical/registrations?mode=real",{headers:{cookie:`pap_session=${f.identity.sessionToken}`,"x-organization-id":f.unit.id,"idempotency-key":f.identity.operationKey}}))).status,400);
 assert.deepEqual(await graph(),initial);
});
test("tenant, role and session are revalidated for replay and status; Admin and Commercial gain no implicit clinical access", async()=>{
 const f=await actor(),foreign=await actor(),payload=valid();await clinicalRegistrationService.submit({...f.identity,payload});const initial=await graph();
 await assert.rejects(clinicalRegistrationService.status({...f.identity,organizationId:foreign.unit.id}));
 for(const role of ["PAP_ADMIN","COMMERCIAL"] as const){const other=await actor(role);await assert.rejects(clinicalRegistrationService.submit({...other.identity,payload:valid()}));}
 await db.roleAssignment.deleteMany({where:{userId:f.user.id}});await assert.rejects(clinicalRegistrationService.status(f.identity));await assert.rejects(clinicalRegistrationService.submit({...f.identity,payload}));
 const live=await actor();await db.session.update({where:{id:live.session.session.id},data:{revokedAt:new Date(),revocationReason:"ADMIN_REVOKED"}});assert.equal((await route.POST(request(live,"POST",valid()))).status,401);assert.deepEqual(await graph(),initial);
});
test("pending claim cannot commit; terminal operations cannot be edited, deleted or truncated", async()=>{
 const f=await actor();const keyHash=createHash("sha256").update(randomUUID()).digest("hex");
 await assert.rejects(db.clinicalRegistrationOperation.create({data:{actorUserId:f.user.id,organizationId:f.unit.id,keyHash,requestFingerprint:keyHash}}));
 await clinicalRegistrationService.cancel(f.identity);const row=await db.clinicalRegistrationOperation.findFirstOrThrow({where:{actorUserId:f.user.id}});
 await assert.rejects(db.clinicalRegistrationOperation.update({where:{id:row.id},data:{keyHash:createHash("sha256").update("different").digest("hex")}}));
 await assert.rejects(db.clinicalRegistrationOperation.delete({where:{id:row.id}}));
 const pg=await import("pg");const client=new pg.default.Client({connectionString:process.env.DATABASE_URL});await client.connect();try{await assert.rejects(client.query('TRUNCATE "clinical_registration_operations"'));}finally{await client.end();}
});
