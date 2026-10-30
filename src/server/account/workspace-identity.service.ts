import {db} from '@/server/db/client';
import {validateSession} from '@/server/auth/session.service';
import {requireOperationalMfa} from '@/server/auth/operational-mfa.service';
import {getEffectiveAccessProfile} from '@/server/iam/effective-access-profile.service';
/** Own effective institution names only. Never an organizational-directory API. */
export async function workspaceInstitutions(token:string){
 return db.$transaction(async tx=>{
  const actor=await validateSession(token,{client:tx,updateLastSeen:false});await requireOperationalMfa(actor,tx);
  const profile=await getEffectiveAccessProfile(actor.user.id,tx);
  const rows=await tx.organization.findMany({where:{id:{in:profile?.organizations.map(o=>o.id)||[]},isActive:true,status:'ACTIVE'},select:{id:true,name:true,type:true,city:true,state:true,parent:{select:{name:true,city:true,state:true}}},orderBy:{id:'asc'}});
  return rows.map(o=>({id:o.id,name:o.name,municipality:o.type==='HEALTH_UNIT'?o.city||o.parent?.city||o.parent?.name||null:null,state:o.state||o.parent?.state||null}));
 },{isolationLevel:'RepeatableRead'});
}
