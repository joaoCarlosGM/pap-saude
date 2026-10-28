import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { db } from "../../src/server/db/client";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createVerifiedSession as createSession } from "../helpers/verified-session";
const origin="http://127.0.0.1:3126";
test.beforeAll(async()=>{expect(new URL(process.env.DATABASE_URL!).pathname).toBe("/pap_p0_registration_test");expect(new URL(process.env.DATABASE_URL!).port).toBe("25443");});
test.afterAll(()=>db.$disconnect());
async function actor(context:BrowserContext){
 const user=await db.user.create({data:{email:`${randomUUID()}@synthetic.invalid`,displayName:"Pessoa sintética"}});
 const pap=await db.organization.create({data:{name:"PAP sintético",type:"PAP",status:"ACTIVE"}});
 const city=await db.organization.create({data:{name:"Município sintético",type:"MUNICIPALITY",status:"ACTIVE",parentId:pap.id}});
 const unit=await db.organization.create({data:{name:"UBS sintética",type:"HEALTH_UNIT",status:"ACTIVE",parentId:city.id}});
 await db.membership.create({data:{userId:user.id,organizationId:unit.id,status:"ACTIVE"}});
 await assignSystemRole({userId:user.id,roleKey:"PROFESSIONAL",organizationId:unit.id});const session=await createSession({userId:user.id});
 await context.addCookies([{name:"pap_session",value:session.token,url:origin,httpOnly:true,sameSite:"Lax"}]);return{user,unit};
}
async function fill(page:Page,name:string,invalid=false){
 await page.getByLabel("Nome completo",{exact:false}).fill(name);await page.getByLabel("Data de nascimento",{exact:false}).fill("1990-01-01");
 await page.getByRole("button",{name:"Próximo →",exact:true}).click();await page.getByLabel("Data da Última Menstruação (DUM)").fill("2026-01-01");
 await page.getByRole("button",{name:"Próximo →",exact:true}).click();if(!invalid)await page.locator("#pa-sistolica").fill("120");
 await page.locator("#pa-diastolica").fill("80");await page.locator("#frequencia-cardiaca").fill("90");await page.locator("#frequencia-respiratoria").fill("16");await page.locator("#temperatura").fill("36.5");
 await page.getByRole("button",{name:"Próximo →",exact:true}).click();await page.locator("#bcf").fill("140");await page.getByRole("button",{name:"Ver Resultado →",exact:true}).click();
 await expect(page.getByRole("button",{name:"Salvar Registro",exact:true})).toBeEnabled();
}
test("lost response after real COMMIT is safely repeated and recovered after reload without another clinical graph",async({page,context})=>{
 const f=await actor(context),name=`Paciente sintética ${randomUUID()}`;const keys:string[]=[];let discarded=false;
 await page.route("**/api/clinical/registrations",async route=>{
  if(route.request().method()!=="POST")return route.continue();keys.push(route.request().headers()["idempotency-key"]);
  if(!discarded){discarded=true;const response=await route.fetch();expect(response.status()).toBe(201);return route.abort("failed");}
  return route.continue();
 });
 await page.goto("/registro");await fill(page,name);await page.getByRole("button",{name:"Salvar Registro",exact:true}).click();
 await expect(page.getByText(/A resposta foi interrompida/)).toBeVisible();expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(1);
 await page.getByRole("button",{name:"Salvar Registro",exact:true}).click();await expect(page.getByRole("button",{name:"Registro salvo",exact:true})).toBeDisabled();
 expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(1);
 await page.reload();await expect(page.getByRole("button",{name:"Registro salvo",exact:true})).toBeDisabled();await expect(page.getByText("Validação clínica: não validado",{exact:true})).toBeVisible();
 expect(await db.clinicalRegistrationOperation.count({where:{actorUserId:f.user.id,status:"COMPLETED"}})).toBe(1);expect(await db.productActivityEvent.count({where:{organizationId:f.unit.id,eventKey:"encounter.completed"}})).toBe(1);
 const values=await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.startsWith("pap.clinicalRegistration.pending.v1:")).map(([,value])=>value));expect(values).toHaveLength(1);expect(values.every(value=>/^[0-9a-f-]{36}$/.test(value))).toBe(true);
});
test("reload of an unconfirmed request requires a server cancellation barrier before starting a new operation",async({page,context})=>{
 const f=await actor(context),name=`Paciente não enviada ${randomUUID()}`;let oldKey="",oldBody:unknown;
 await page.route("**/api/clinical/registrations",async route=>{
  if(route.request().method()==="POST"&&!oldKey){oldKey=route.request().headers()["idempotency-key"];oldBody=route.request().postDataJSON();return route.abort("failed");}
  return route.continue();
 });
 await page.goto("/registro");await fill(page,name);await page.getByRole("button",{name:"Salvar Registro",exact:true}).click();await expect(page.getByText(/A resposta foi interrompida/)).toBeVisible();
 await page.reload();await expect(page.getByText(/Há uma operação anterior sem confirmação/)).toBeVisible();
 await page.getByRole("button",{name:"Novo Registro",exact:true}).click();await expect(page.getByText(/Há uma operação anterior sem confirmação/)).toHaveCount(0);
 expect(await db.clinicalRegistrationOperation.count({where:{actorUserId:f.user.id,status:"CANCELLED"}})).toBe(1);expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(0);
 const late=await page.request.post("/api/clinical/registrations",{headers:{origin,"x-organization-id":f.unit.id,"idempotency-key":oldKey},data:oldBody});expect(late.status()).toBe(409);
 await fill(page,`Nova paciente sintética ${randomUUID()}`);await page.getByRole("button",{name:"Salvar Registro",exact:true}).click();await expect(page.getByRole("button",{name:"Registro salvo",exact:true})).toBeDisabled();
 expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(1);expect(await db.clinicalRegistrationOperation.count({where:{actorUserId:f.user.id,status:"PENDING"}})).toBe(0);
});
test("invalid form retry issues no clinical mutation from the real browser",async({page,context})=>{
 const f=await actor(context);let posts=0;page.on("request",request=>{if(request.method()==="POST"&&new URL(request.url()).pathname.startsWith("/api/clinical/"))posts++;});
 await page.goto("/registro");await fill(page,`Não persistir ${randomUUID()}`,true);
 for(let i=0;i<2;i++){await page.getByRole("button",{name:"Salvar Registro",exact:true}).click();await expect(page.getByText("PA sistólica é obrigatório.",{exact:true})).toBeVisible();}
 expect(posts).toBe(0);expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(0);
});

test("two tabs in the same authenticated origin share one durable operation under the browser lock",async({page,context})=>{
 const f=await actor(context),name=`Duas abas sintéticas ${randomUUID()}`;const second=await context.newPage();
 try{
  await page.goto("/registro");await second.goto("/registro");await fill(page,name);await fill(second,name);
  const keys:string[]=[];for(const tab of [page,second])tab.on("request",request=>{if(request.method()==="POST"&&new URL(request.url()).pathname==="/api/clinical/registrations")keys.push(request.headers()["idempotency-key"]);});
  await Promise.all([page.getByRole("button",{name:"Salvar Registro",exact:true}).click(),second.getByRole("button",{name:"Salvar Registro",exact:true}).click()]);
  for(const tab of [page,second])await expect(tab.getByRole("button",{name:"Registro salvo",exact:true})).toBeDisabled();
  expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(1);
  await second.close();const reopened=await context.newPage();try{await reopened.goto("/registro");await expect(reopened.getByRole("button",{name:"Registro salvo",exact:true})).toBeDisabled();expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(1);}finally{await reopened.close();}
 }finally{if(!second.isClosed())await second.close();}
});
