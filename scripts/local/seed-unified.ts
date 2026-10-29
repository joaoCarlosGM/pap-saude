/** Explicit, local-only synthetic fixture. Never imported by the application. */
import {randomBytes,randomUUID} from "node:crypto";
import {existsSync,readFileSync,writeFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
import {db} from "../../src/server/db/client";
import {assertLocalDatabase} from "./provision";
import {bootstrapSystemIam} from "../../src/server/iam/bootstrap.service";
import type {SystemRoleKey} from "../../src/server/iam/system-role-catalog";
import {assignSystemRole} from "../../src/server/iam/role-assignment.service";
import {hashPassword} from "../../src/server/auth/password";
import {createPatient} from "../../src/server/patients/patient.service";
import {linkPatientToOrganization} from "../../src/server/patients/patient-organization.service";
import {createPregnancy} from "../../src/server/pregnancies/pregnancy.service";
import {createEncounter,startEncounter,completeEncounter} from "../../src/server/encounters/encounter.service";
import {createVitalSigns} from "../../src/server/vital-signs/vital-signs.service";
type Account={email:string;password:string;role:SystemRoleKey|"PROFESSIONAL_B"};
async function main(){
  if(process.env.PAP_LOCAL_PROFILE!=="p0-unified-rc")throw Error("UNIFIED_PROFILE_ONLY");
  await assertLocalDatabase();
  const dir=resolve(".local/pap-p0-unified-rc"),path=resolve(dir,"seed-accounts.json");
  for(const p of [resolve(".local"),dir]){const s=lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)||(process.getuid&&s.uid!==process.getuid()))throw Error("PRIVATE_DIRECTORY_REQUIRED");}
  let seed:{id:string;accounts:Account[]};
  if(existsSync(path)){
    const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)||(process.getuid&&s.uid!==process.getuid()))throw Error("PRIVATE_CREDENTIALS_REQUIRED");
    seed=JSON.parse(readFileSync(path,"utf8"));
  }else{
    if(await db.user.count()||await db.organization.count())throw Error("SEED_REQUIRES_EMPTY_NEW_LAB");
    seed={id:randomUUID(),accounts:(["PAP_ADMIN","PAP_MANAGER","MUNICIPAL_ADMIN","HEALTH_UNIT_ADMIN","PROFESSIONAL","COMMERCIAL","PROFESSIONAL_B"] as const).map(role=>({role,email:`${role.toLowerCase()}@unified.synthetic.invalid`,password:randomBytes(24).toString("base64url")}))};
    writeFileSync(path,JSON.stringify(seed,null,2)+"\n",{flag:"wx",mode:0o600});
  }
  if(await db.auditEvent.findFirst({where:{action:"LOCAL_UNIFIED_SEEDED",resourceId:seed.id}})){console.log("Fixture existente preservada; nenhuma senha, MFA ou registro foi modificado.");return;}
  if(await db.user.count()||await db.organization.count())throw Error("FOREIGN_OR_PARTIAL_SEED_REFUSED");
  await bootstrapSystemIam();
  const hashes=await Promise.all(seed.accounts.map(a=>hashPassword(a.password)));
  await db.$transaction(async tx=>{
    // Serialize bootstrap attempts and check again after taking the lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73103600)`;
    if(await tx.auditEvent.findFirst({where:{action:"LOCAL_UNIFIED_SEEDED",resourceId:seed.id}}))return;
    if(await tx.user.count()||await tx.organization.count())throw Error("LAB_NOT_EMPTY");
    const pap=await tx.organization.create({data:{name:"PAP Sintético — Homologação 3600",type:"PAP",status:"ACTIVE"}});
    const cities=await Promise.all(["Alfa","Beta"].map(label=>tx.organization.create({data:{name:`Município Sintético ${label}`,type:"MUNICIPALITY",parentId:pap.id,status:"ACTIVE"}})));
    const units=await Promise.all(cities.map((c,i)=>tx.organization.create({data:{name:`UBS Sintética ${i+1}`,type:"HEALTH_UNIT",parentId:c.id,status:"ACTIVE"}})));
    const users=[];
    for(const [i,a] of seed.accounts.entries()){
      const user=await tx.user.create({data:{email:a.email,displayName:`Conta Sintética ${a.role}`}});users.push(user);
      await tx.passwordCredential.create({data:{userId:user.id,passwordHash:hashes[i],algorithm:"ARGON2ID",mustChange:false}});
      const role=a.role==="PROFESSIONAL_B"?"PROFESSIONAL":a.role;
      const organizationId=role==="MUNICIPAL_ADMIN"?cities[0].id:["HEALTH_UNIT_ADMIN","PROFESSIONAL"].includes(role)?units[a.role==="PROFESSIONAL_B"?1:0].id:undefined;
      if(organizationId)await tx.membership.create({data:{userId:user.id,organizationId,status:"ACTIVE"}});
      await assignSystemRole({userId:user.id,roleKey:role,organizationId},tx);
    }
    for(let i=0;i<3;i++){
      const unit=units[i===2?1:0],author=users[i===2?6:4];
      const patient=await createPatient({fullName:`Paciente Sintética Homologação ${i+1}`,birthDate:"1995-01-01"},tx);
      await linkPatientToOrganization({patientId:patient.id,organizationId:unit.id},tx);
      const pregnancy=await createPregnancy({patientId:patient.id},tx);
      const encounter=await createEncounter({patientId:patient.id,organizationId:unit.id,pregnancyId:pregnancy.id,chiefComplaint:"Registro sintético para homologação local"},tx);
      await startEncounter(encounter.id,tx);
      await createVitalSigns({actorContext:{actorUserId:author.id,organizationId:unit.id},encounterId:encounter.id,systolicBp:120,diastolicBp:80,heartRate:80,respiratoryRate:16},tx);
      if(i!==1)await completeEncounter(encounter.id,author.id,tx);
    }
    await tx.auditEvent.create({data:{actorUserId:users[0].id,action:"LOCAL_UNIFIED_SEEDED",resourceType:"LOCAL_LAB",resourceId:seed.id,after:{synthetic:true,profile:"p0-unified-rc",users:7,patients:3}}});
  },{timeout:30000});
  console.log("Contas e registros sintéticos persistentes criados. Credenciais somente em .local/pap-p0-unified-rc/seed-accounts.json (0600). Configure MFA real pelo navegador em cada conta. Nenhum fator foi pré-configurado.");
}
main().catch(()=>{console.error("Seed recusado/falhou; dados e credenciais existentes foram preservados. Confira perfil, propriedade, marker e banco novo vazio.");process.exitCode=1;}).finally(()=>db.$disconnect());
