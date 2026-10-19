import { AuditOutcome, LoginAttemptOutcome, MfaFactorStatus, SessionRevocationReason } from "@prisma/client";
import { db } from "@/server/db/client";
import { verifyPassword } from "./password";
import { sha256 } from "@/server/security/crypto";
import { startTotpEnrollment, confirmTotpEnrollment } from "./totp.service";
import { verifyActiveTotp } from "./totp-login.service";
import { generateRecoveryCodes } from "./recovery-code.service";
import { changeOwnPassword } from "./password-security.service";

export class AccountSecurityError extends Error {}

// Durable account-level reauthentication backoff, not a process-local counter.
export async function requireReauthentication(userId:string,password:string,code?:string,requireMfa=true):Promise<boolean>{
  const identityHash=sha256(`reauth-user:v1\0${userId}`);
  const originHash=sha256(`reauth-scope:v1\0${userId}`);
  const now=new Date();
  const since=new Date(now.getTime()-10*60*1000);
  const failures=await db.loginAttempt.count({where:{identityHash,originHash,outcome:LoginAttemptOutcome.FAILURE,occurredAt:{gte:since}}});
  if(failures>=5) throw new AccountSecurityError("REAUTH_THROTTLED");
  const reject=async()=>{
    await db.loginAttempt.create({data:{identityHash,originHash,outcome:LoginAttemptOutcome.FAILURE,occurredAt:new Date()}});
    throw new AccountSecurityError("INVALID_REAUTH");
  };
  const credential = await db.passwordCredential.findUnique({where:{userId},select:{passwordHash:true}});
  if(!credential || !await verifyPassword(credential.passwordHash,password)) return reject();
  const active = await db.mfaFactor.count({where:{userId,status:MfaFactorStatus.ACTIVE}});
  if(active>0 && requireMfa){
    if(!code) return reject();
    try {await verifyActiveTotp(userId,code);}catch{return reject();}
  }
  return active>0;
}

export async function accountSecurityPosture(userId:string,sessionId:string){
  const now=new Date();
  const [factors,codes,sessions] = await Promise.all([
    db.mfaFactor.findMany({where:{userId,status:{in:["PENDING","ACTIVE"]}},select:{id:true,status:true,createdAt:true,enabledAt:true}}),
    db.mfaRecoveryCode.count({where:{userId,usedAt:null,revokedAt:null}}),
    db.session.findMany({where:{userId,revokedAt:null,expiresAt:{gt:now}},select:{id:true,createdAt:true,expiresAt:true,lastSeenAt:true,userAgent:true},orderBy:{lastSeenAt:"desc"},take:50}),
  ]);
  return {factors,remainingRecoveryCodes:codes,sessions:sessions.map(s=>({...s,current:s.id===sessionId}))};
}

export async function runOwnSecurityAction(input:{userId:string;sessionId:string;action:string;password?:string;code?:string;factorId?:string;targetSessionId?:string;newPassword?:string}){
  const {userId,sessionId,action}=input;
  if(action==="REVOKE_SESSION"){
    if(!input.targetSessionId || input.targetSessionId.length>80) throw new AccountSecurityError("INVALID_SESSION");
    const now=new Date();
    await db.$transaction(async tx=>{
      const updated=await tx.session.updateMany({where:{id:input.targetSessionId,userId,revokedAt:null},data:{revokedAt:now,revocationReason:SessionRevocationReason.ADMIN_REVOKED}});
      if(updated.count!==1) throw new AccountSecurityError("INVALID_SESSION");
      await tx.auditEvent.create({data:{actorUserId:userId,sessionId,action:"SESSION_SELF_REVOKED",resourceType:"USER_SESSION",resourceId:input.targetSessionId,outcome:AuditOutcome.SUCCESS,occurredAt:now}});
    });
    return {ok:true,sessionRevoked:input.targetSessionId===sessionId};
  }
  if(action==="REVOKE_ALL_SESSIONS"){
    if(typeof input.password!=="string") throw new AccountSecurityError("INVALID_REAUTH");
    await requireReauthentication(userId,input.password,input.code);
    const now=new Date();
    await db.$transaction(async tx=>{
      await tx.session.updateMany({where:{userId,revokedAt:null},data:{revokedAt:now,revocationReason:SessionRevocationReason.SECURITY_EVENT}});
      await tx.auditEvent.create({data:{actorUserId:userId,sessionId,action:"SESSIONS_SELF_REVOKED",resourceType:"USER",resourceId:userId,outcome:AuditOutcome.SUCCESS,occurredAt:now}});
    });
    return {ok:true,sessionRevoked:true};
  }
  if(typeof input.password!=="string") throw new AccountSecurityError("INVALID_REAUTH");
  if(action==="CHANGE_PASSWORD"){
    if(typeof input.newPassword!=="string") throw new AccountSecurityError("INVALID_PASSWORD");
    const active=await requireReauthentication(userId,input.password,input.code);
    await changeOwnPassword({userId,currentPassword:input.password,newPassword:input.newPassword,totpVerified:active});
    return {ok:true,sessionRevoked:true};
  }
  if(action==="START_MFA"){
    // Initial self-enrollment only. Replacing an active factor requires a
    // separately authorized recovery workflow, not password-only re-enrollment.
    if(await db.mfaFactor.count({where:{userId,status:MfaFactorStatus.ACTIVE}})>0)
      throw new AccountSecurityError("MFA_ALREADY_ENABLED");
    await requireReauthentication(userId,input.password,input.code);
    const result=await startTotpEnrollment({userId});
    await db.auditEvent.create({data:{actorUserId:userId,sessionId,action:"MFA_ENROLLMENT_STARTED",resourceType:"USER",resourceId:userId}});
    return result;
  }
  if(action==="CONFIRM_MFA"){
    if(typeof input.factorId!=="string" || typeof input.code!=="string") throw new AccountSecurityError("INVALID_MFA");
    // A pending factor must not displace an already-active one.
    if(await db.mfaFactor.count({where:{userId,status:MfaFactorStatus.ACTIVE}})>0)
      throw new AccountSecurityError("MFA_ALREADY_ENABLED");
    await requireReauthentication(userId,input.password,undefined,false);
    const result=await confirmTotpEnrollment({userId,factorId:input.factorId,code:input.code});
    await db.auditEvent.create({data:{actorUserId:userId,sessionId,action:"MFA_ENROLLMENT_CONFIRMED",resourceType:"USER",resourceId:userId}});
    return result;
  }
  if(action==="GENERATE_RECOVERY_CODES"){
    await requireReauthentication(userId,input.password,input.code);
    const active=await db.mfaFactor.count({where:{userId,status:MfaFactorStatus.ACTIVE}});
    if(!active) throw new AccountSecurityError("MFA_REQUIRED");
    const result=await generateRecoveryCodes(userId);
    await db.auditEvent.create({data:{actorUserId:userId,sessionId,action:"RECOVERY_CODES_REGENERATED",resourceType:"USER",resourceId:userId}});
    return result;
  }
  throw new AccountSecurityError("INVALID_ACTION");
}
