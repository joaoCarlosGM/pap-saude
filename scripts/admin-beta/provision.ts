import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {assignSystemRole} from '../../src/server/iam/role-assignment.service';
import {hashPassword,validatePasswordPolicy} from '../../src/server/auth/password';

export async function provisionBetaAdmin(input:{email:string;displayName:string;institutionName:string;password:string}){
 const url=new URL(process.env.DATABASE_URL||'');
 if(process.env.PAP_ADMIN_BETA_ONLY!=='1'||process.env.NODE_ENV!=='production'||url.hostname!=='beta-db'||url.pathname!=='/pap_admin_beta'||url.username!=='pap_beta_migrator'||url.hash||!['','?schema=public'].includes(url.search))throw Error('BETA_ONLY');
 const identity=await db.$queryRaw<{db:string;role:string;marker:string}[]>`SELECT current_database() db,current_user role,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
 if(identity[0]?.db!=='pap_admin_beta'||identity[0]?.role!=='pap_beta_migrator'||!identity[0]?.marker?.startsWith('pap-admin-beta:ready:'))throw Error('BETA_VERIFICATION_REQUIRED');
 if(await db.user.count()||await db.organization.count())throw Error('INITIAL_DATABASE_NOT_EMPTY');
 const email=input.email?.trim().toLowerCase(),name=input.displayName?.trim(),institution=input.institutionName?.trim();
 if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||name.length<2||name.length>200||!institution||institution.length<2||institution.length>200||typeof input.password!=='string'||input.password.length<16)throw Error('INVALID_OPERATOR_INPUT');
 validatePasswordPolicy(input.password);const passwordHash=await hashPassword(input.password);
 await bootstrapSystemIam();
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(4103101)`;
  if(await tx.user.count()||await tx.organization.count()||await tx.roleAssignment.count())throw Error('INITIAL_DATABASE_NOT_EMPTY');
  await tx.organization.create({data:{name:institution,type:'PAP',status:'ACTIVE',isActive:true}});
  const user=await tx.user.create({data:{email,displayName:name,isActive:true}});
  await tx.passwordCredential.create({data:{userId:user.id,passwordHash,algorithm:'ARGON2ID',mustChange:false}});
  await assignSystemRole({userId:user.id,roleKey:'PAP_ADMIN'},tx);
  await tx.auditEvent.create({data:{actorUserId:user.id,action:'ADMIN_BETA_INITIAL_IDENTITY',resourceType:'USER',resourceId:user.id,metadata:{operatorProvided:true,mfaRequired:true}}});
  return user.id;
 },{isolationLevel:'Serializable',timeout:15000});
}
async function main(){let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>4096)throw Error('INPUT_TOO_LARGE');}await provisionBetaAdmin(JSON.parse(raw));console.log('PAP_ADMIN provisionado. Login e inscrição MFA/TOTP obrigatórios; nenhum fator ou sessão foi pré-verificado.');}
if(process.argv[1]&&/provision\.(?:cjs|ts)$/.test(process.argv[1]))main().catch(error=>{const code=['BETA_ONLY','BETA_VERIFICATION_REQUIRED','INITIAL_DATABASE_NOT_EMPTY','INVALID_OPERATOR_INPUT','INPUT_TOO_LARGE'].includes(error?.message)?error.message:'INVALID_INPUT_OR_DATABASE_ERROR';console.error('BETA_PROVISION_REFUSED '+code);process.exitCode=1;}).finally(()=>db.$disconnect());
