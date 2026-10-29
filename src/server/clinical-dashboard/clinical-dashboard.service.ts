import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { validateSession } from "@/server/auth/session.service";
import { requireOperationalMfa } from "@/server/auth/operational-mfa.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import type { DashboardData } from "@/types/dashboard";
/** Fixed query count, distinct patients, live effective health-unit grants only.
 * UTC calendar months; no inferred risk, MEOWS score, author or comparison. */
export async function clinicalDashboard(token: string, now=new Date()):Promise<DashboardData> {
 return db.$transaction(async tx=>{
  const actor=await validateSession(token,{client:tx,updateLastSeen:false});await requireOperationalMfa(actor,tx);
  const profile=await getEffectiveAccessProfile(actor.user.id,tx);
  const units=[...new Set(profile?.roles.filter(r=>r.scope==="HEALTH_UNIT"&&r.organization&&r.permissions.includes("patient.read")&&r.permissions.includes("encounter.read")).map(r=>r.organization!.id)??[])];
  if(!units.length)throw new AccessDeniedError();
  const scope={organizationId:{in:units}}, encounterScope={OR:units.map(organizationId=>({organizationId,patient:{isActive:true,organizations:{some:{organizationId,unlinkedAt:null}}}}))}, linked={isActive:true,organizations:{some:{...scope,unlinkedAt:null}}};
  const current=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const months=Array.from({length:6},(_,i)=>new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1)));
  const [patients,pregnancies,completed,inProgress,recent,monthly]=await Promise.all([
   tx.patient.count({where:linked}),tx.pregnancy.count({where:{status:"ACTIVE",patient:linked}}),
   tx.encounter.count({where:{...encounterScope,status:"COMPLETED",occurredAt:{gte:current,lte:now}}}),
   tx.encounter.count({where:{...encounterScope,status:"IN_PROGRESS"}}),
   tx.encounter.findMany({where:{...encounterScope,occurredAt:{lte:now}},select:{id:true,status:true,occurredAt:true,patient:{select:{fullName:true}}},orderBy:[{occurredAt:"desc"},{id:"desc"}],take:5}),
   Promise.all(months.map((start,i)=>tx.encounter.count({where:{...encounterScope,status:"COMPLETED",occurredAt:{gte:start,lt:i===5?new Date(+now+1):months[i+1]}}}))),
  ]);
  return {kpis:[{id:"patients",title:"Pacientes ativos vinculados",value:String(patients),description:"Pessoas distintas nas suas UBS autorizadas · todos os períodos",icon:"users",tone:"pink"},{id:"pregnancies",title:"Gestações ativas",value:String(pregnancies),description:"Pacientes ativos vinculados às UBS autorizadas",icon:"heart",tone:"violet"},{id:"completed",title:"Atendimentos concluídos no mês",value:String(completed),description:"Ocorrência em UTC · COMPLETED · paciente/vínculo ativos",icon:"clipboard",tone:"emerald"},{id:"in-progress",title:"Atendimentos em andamento",value:String(inProgress),description:"IN_PROGRESS · UBS autorizadas e vínculo ativo",icon:"clock",tone:"blue"}],monthly:months.map((m,i)=>({month:m.toLocaleDateString("pt-BR",{month:"short",year:"2-digit",timeZone:"UTC"}),total:monthly[i]})),recent:recent.map(r=>({id:r.id,patient:r.patient.fullName,initials:r.patient.fullName.split(/\s+/).slice(0,2).map(s=>s[0]).join(""),gestationalAge:"Idade gestacional não calculada nesta visão",professional:"Autoria disponível no histórico do atendimento",time:r.occurredAt.toLocaleString("pt-BR",{timeZone:"UTC"})+" UTC",score:null,classification:null,statusLabel:({DRAFT:"Rascunho",IN_PROGRESS:"Em andamento",COMPLETED:"Concluído",CANCELLED:"Cancelado"})[r.status]})),risks:[],deliveries:[]};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
