import assert from "node:assert/strict";
import test from "node:test";
import type { RegistrationData } from "../../src/types/registration";
import { submitClinicalRegistration, resumeClinicalRegistration, restartClinicalRegistration } from "../../src/lib/clinical-api/registration";

const valid: RegistrationData = {
  cpf: "",
  nomeCompleto: "Paciente sintética",
  dataNascimento: "2000-01-01",
  primeiroAtendimento: true,
  dum: "",
  paSistolica: "120",
  paDiastolica: "80",
  frequenciaCardiaca: "90",
  frequenciaRespiratoria: "16",
  temperatura: "36.5",
  saturacaoO2: "98",
  nivelConsciencia: "ALERT",
  debitoUrinario: "",
  proteinuria: "",
  alturaUterina: "",
  bcf: "",
  movimentacaoFetal: "",
  edema: "",
  sangramentoVaginal: "",
  pesoAtual: "",
  queixasPrincipais: "",
  observacoesProfissional: "",
};

const invalidInputs: Array<[string, Partial<RegistrationData>]> = [
  ["required systolic BP", { paSistolica: "" }],
  ["required diastolic BP", { paDiastolica: "" }],
  ["required heart rate", { frequenciaCardiaca: "" }],
  ["required respiratory rate", { frequenciaRespiratoria: "" }],
  ["zero BP", { paSistolica: "0" }],
  ["fractional required integer", { frequenciaCardiaca: "90.5" }],
  ["integer storage overflow", { frequenciaRespiratoria: "2147483648" }],
  ["invalid optional numeric", { temperatura: "not-a-number" }],
  ["non-finite numeric", { pesoAtual: "Infinity" }],
  ["temperature precision", { temperatura: "36.55" }],
  ["temperature Decimal(4,1) overflow", { temperatura: "1000" }],
  ["uterine height Decimal(5,2) overflow", { alturaUterina: "1000" }],
  ["weight Decimal(6,2) overflow", { pesoAtual: "10000" }],
  ["saturation above range", { saturacaoO2: "101" }],
  ["negative saturation", { saturacaoO2: "-1" }],
  ["fractional saturation", { saturacaoO2: "98.1" }],
  ["negative urine output", { debitoUrinario: "-1" }],
  ["urine output storage overflow", { debitoUrinario: "2147483648" }],
  ["unsupported consciousness", { nivelConsciencia: "UNKNOWN" }],
  ["unsupported proteinuria", { proteinuria: "UNKNOWN" }],
  ["prototype property is not proteinuria", { proteinuria: "__proto__" }],
  ["negative uterine height", { alturaUterina: "-1" }],
  ["uterine height precision", { alturaUterina: "30.123" }],
  ["fractional fetal heart rate", { bcf: "140.5" }],
  ["zero fetal heart rate", { bcf: "0" }],
  ["invalid fetal movement", { movimentacaoFetal: "UNKNOWN" }],
  ["unsupported edema", { edema: "UNKNOWN" }],
  ["invalid bleeding", { sangramentoVaginal: "UNKNOWN" }],
  ["nonpositive weight", { pesoAtual: "0" }],
  ["weight precision", { pesoAtual: "65.123" }],
  ["missing name", { nomeCompleto: " " }],
  ["short CPF", { cpf: "123" }],
  ["invalid birth date", { dataNascimento: "invalid" }],
  ["future birth date", { dataNascimento: "2999-01-01" }],
  ["invalid last menstrual date", { dum: "invalid" }],
  ["future last menstrual date", { dum: "2999-01-01" }],
  ["oversized complaint", { queixasPrincipais: "x".repeat(2001) }],
  ["oversized notes", { observacoesProfissional: "x".repeat(5001) }],
];

for (const [label, input] of invalidInputs) {
 test(`preflight rejects ${label} before any request, including a repeated submission`, async () => {
  const previous=globalThis.fetch; let requests=0;
  globalThis.fetch=async()=>{requests++;throw new Error("REQUEST_NOT_EXPECTED");};
  try { for(let i=0;i<2;i++) await assert.rejects(submitClinicalRegistration({...valid,...input})); assert.equal(requests,0); }
  finally {globalThis.fetch=previous;}
 });
}

class MemoryStorage {
 readonly values=new Map<string,string>();
 getItem(key:string){return this.values.get(key)??null;}
 setItem(key:string,value:string){this.values.set(key,value);}
 removeItem(key:string){this.values.delete(key);}
}
async function browser(run:(state:{storage:MemoryStorage;requests:Array<{method:string;key:string|null;path:string;body?:RegistrationData}>;setIdentity:(id:string)=>void;reply:(fn:(method:string)=>Response|Promise<Response>)=>void})=>Promise<void>) {
 const previous=globalThis.fetch,oldWindow=Object.getOwnPropertyDescriptor(globalThis,"window");
 const storage=new MemoryStorage(),requests:Array<{method:string;key:string|null;path:string;body?:RegistrationData}>=[];
 let id="synthetic-user",handler:(method:string)=>Response|Promise<Response>=()=>Response.json({status:"COMPLETED",replayed:false,registration:{patientId:"synthetic-patient",pregnancyId:null,encounterId:"synthetic-encounter",meows:{clinicallyValidated:false,meowsScore:null}}});
 let queue: Promise<unknown> = Promise.resolve();
 const locks = { request: (_name: string, _options: unknown, fn: () => Promise<unknown>) => {
  const result=queue.then(fn);queue=result.catch(()=>undefined);return result;
 } };
 Object.defineProperty(globalThis,"window",{configurable:true,value:{localStorage:storage,sessionStorage:new MemoryStorage(),navigator:{locks}}});
 globalThis.fetch=async(path,init)=>{
  if(String(path)==="/api/clinical/context") return Response.json({user:{id},organizations:[{id:"synthetic-unit"}]});
  const headers=new Headers(init?.headers);requests.push({method:init?.method??"GET",key:headers.get("idempotency-key"),path:String(path),...(init?.body?{body:JSON.parse(String(init.body))}:{})});
  assert.equal(headers.get("x-organization-id"),"synthetic-unit");assert.equal(String(path),"/api/clinical/registrations");
  return handler(init?.method??"GET");
 };
 try {await run({storage,requests,setIdentity:next=>{id=next;},reply:fn=>{handler=fn;}});}
 finally{globalThis.fetch=previous;if(oldWindow)Object.defineProperty(globalThis,"window",oldWindow);else Reflect.deleteProperty(globalThis,"window");}
}
test("a valid save uses one atomic POST and stores only its opaque UUID",()=>browser(async({storage,requests})=>{
 const result=await submitClinicalRegistration(valid);assert.equal(result.encounterId,"synthetic-encounter");assert.equal(requests.length,1);assert.equal(requests[0].method,"POST");assert.deepEqual(requests[0].body,valid);
 assert.equal(storage.values.size,1);const [key]=storage.values.values();assert.match(key,/^[0-9a-f-]{36}$/);assert.equal(key,requests[0].key);assert.equal(JSON.stringify([...storage.values]).includes(valid.nomeCompleto),false);
}));
test("lost response preserves the UUID for the exact repeated request",()=>browser(async({storage,requests,reply})=>{
 let calls=0;reply(()=>{if(calls++===0)throw new TypeError("SYNTHETIC_RESPONSE_LOSS");return Response.json({status:"COMPLETED",replayed:true,registration:{encounterId:"synthetic-result",meows:{clinicallyValidated:false}}});});
 await assert.rejects(submitClinicalRegistration(valid));const first=[...storage.values.values()][0];const result=await submitClinicalRegistration(valid);assert.equal(result.encounterId,"synthetic-result");assert.equal(requests.length,2);assert.equal(requests[0].key,first);assert.equal(requests[1].key,first);
}));
test("reload recovery retrieves a committed result without resubmitting the form",()=>browser(async({requests,reply})=>{
 reply(()=>{throw new TypeError("SYNTHETIC_RESPONSE_LOSS");});await assert.rejects(submitClinicalRegistration(valid));const key=requests[0].key;
 reply(()=>Response.json({status:"COMPLETED",replayed:true,registration:{encounterId:"confirmed-result",meows:{clinicallyValidated:false}}}));
 const result=await resumeClinicalRegistration();assert.equal(result?.status,"COMPLETED");if(result?.status==="COMPLETED")assert.equal(result.registration.encounterId,"confirmed-result");assert.equal(requests[1].method,"GET");assert.equal(requests[1].key,key);
}));
test("NOT_FOUND retains the previous UUID until server cancellation creates a safe barrier",()=>browser(async({storage,requests,reply})=>{
 reply(()=>{throw new TypeError("SYNTHETIC_RESPONSE_LOSS");});await assert.rejects(submitClinicalRegistration(valid));const key=requests[0].key;
 reply(()=>Response.json({status:"NOT_FOUND"}));assert.deepEqual(await resumeClinicalRegistration(),{status:"NOT_FOUND"});assert.equal([...storage.values.values()][0],key);
 reply(method=>{assert.equal(method,"DELETE");return Response.json({status:"CANCELLED"});});assert.deepEqual(await restartClinicalRegistration(),{status:"CANCELLED"});assert.equal(storage.values.size,0);
}));
test("a completed operation must be acknowledged before clearing its UUID for a new record",()=>browser(async({storage,requests})=>{
 await submitClinicalRegistration(valid);const key=requests[0].key;assert.equal((await restartClinicalRegistration())?.status,"COMPLETED");assert.equal([...storage.values.values()][0],key);
 assert.equal((await restartClinicalRegistration(true))?.status,"COMPLETED");assert.equal(storage.values.size,0);
 await submitClinicalRegistration(valid);assert.notEqual(requests.at(-1)?.key,key);
}));
test("a different authenticated identity never reuses another identity's saved operation",()=>browser(async({requests,setIdentity,storage})=>{
 await submitClinicalRegistration(valid);const first=requests[0].key;setIdentity("another-synthetic-user");await submitClinicalRegistration(valid);assert.notEqual(requests[1].key,first);assert.equal(storage.values.size,2);
 setIdentity("synthetic-user");await resumeClinicalRegistration();assert.equal(requests[2].key,first);
}));
test("unavailable durable storage fails closed before issuing a clinical POST",()=>browser(async({storage,requests})=>{
 storage.setItem=()=>{throw new Error("STORAGE_UNAVAILABLE");};await assert.rejects(submitClinicalRegistration(valid));assert.equal(requests.length,0);
}));

test("simultaneous submissions in the same origin lock reuse one durable operation identity",()=>browser(async({requests,storage})=>{
 const results=await Promise.all([submitClinicalRegistration(valid),submitClinicalRegistration(valid)]);assert.equal(results.length,2);assert.equal(requests.length,2);assert.equal(requests[0].key,requests[1].key);assert.equal(storage.values.size,1);
}));
test("unavailable cross-tab locking fails closed before a clinical POST",()=>browser(async({requests})=>{
 Object.defineProperty(window,"navigator",{value:{},configurable:true});await assert.rejects(submitClinicalRegistration(valid));assert.equal(requests.length,0);
}));
