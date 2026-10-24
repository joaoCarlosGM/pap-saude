import { randomBytes } from "node:crypto";
import { AuditOutcome, PasswordAlgorithm, Prisma, SessionRevocationReason } from "@prisma/client";
import { db } from "@/server/db/client";
import { sha256 } from "@/server/security/crypto";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "./password";
import { normalizeEmail } from "./password-authentication.service";
import { createLoginProtectionHashes, evaluateLoginThrottle, recordLoginFailure, recordLoginSuccess } from "./login-abuse.service";
import { verifyActiveTotp } from "./totp-login.service";

const DOMAIN = "pap-saude:password-reset:v1";
const RESET_TTL_MS = 30 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

export class PasswordSecurityError extends Error {
  constructor(public readonly kind: "INVALID" | "THROTTLED" | "UNAVAILABLE") { super(kind); }
}

export function hashPasswordResetToken(token: string): string {
  return sha256(`${DOMAIN}\0${token}`);
}

function validToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,100}$/.test(token);
}

export async function issuePasswordReset(input: {
  email: string;
  origin: string;
  now?: Date;
  deliver: (email: string, token: string, metadata?: { id: string; expiresAt: Date; createdAt: Date }) => Promise<void>;
}): Promise<void> {
  const now = input.now ?? new Date();
  const email = normalizeEmail(input.email);
  const originHash = sha256(`password-reset-origin:v1\0${input.origin}`);
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  const token = randomBytes(32).toString("base64url");
  const saved = await db.$transaction(async tx => {
    // Read-committed, atomic counter UPSERTs lock origin first and identity
    // second in every worker. Rolling counts are evaluated under those locks.
    // Atomic shared buckets also count unknown identities. Never expose throttle
    // or account existence in the HTTP response. Existing 15-minute limits stay.
    for (const [identity, limit] of [[originHash, 20], [sha256(`reset-email:v1\0${email}`), 3]] as const) {
      const window = Math.floor(now.getTime() / WINDOW_MS);
      const key = sha256(`reset-limit:v1:${window}:${identity}`);
      const bucket = await tx.betaAbuseBucket.upsert({ where: { key },
        create: { key, count: 1, expiresAt: new Date((window + 2) * WINDOW_MS) },
        update: { count: { increment: 1 } } });
      if (bucket.count > limit) return null;
    }
    const user = await tx.user.findUnique({where:{email},select:{id:true,email:true,isActive:true,passwordCredential:{select:{id:true}}}});
    if (!user?.isActive || !user.passwordCredential) return null;
    // Retain the rolling-window limits as well as atomic window buckets.
    if (await tx.passwordResetToken.count({where:{originHash,createdAt:{gte:cutoff}}}) >= 20 ||
        await tx.passwordResetToken.count({where:{userId:user.id,createdAt:{gte:cutoff}}}) >= 3) return null;
    const reset = await tx.passwordResetToken.create({data:{userId:user.id,tokenHash:hashPasswordResetToken(token),originHash,createdAt:now,expiresAt:new Date(now.getTime()+RESET_TTL_MS)}});
    await tx.auditEvent.create({ data: { action: "PASSWORD_RESET_REQUESTED", resourceType: "USER", resourceId: user.id, after: { resetId: reset.id } } });
    return { ...reset, email: user.email };
  });
  if (!saved) return;
  try {
    await input.deliver(saved.email,token,saved);
  } catch {
    await db.passwordResetToken.updateMany({where:{id:saved.id,consumedAt:null},data:{revokedAt:new Date()}});
    // Do not expose mail configuration or account existence to a caller.
  }
}

export async function consumePasswordReset(input: {token:string;newPassword:string;now?:Date}): Promise<void> {
  const now = input.now ?? new Date();
  if (!validToken(input.token)) throw new PasswordSecurityError("INVALID");
  validatePasswordPolicy(input.newPassword);
  const tokenHash = hashPasswordResetToken(input.token);
  // Hash the replacement before locking the credential row.
  const passwordHash = await hashPassword(input.newPassword);
  await db.$transaction(async tx => {
    const row = await tx.passwordResetToken.findUnique({where:{tokenHash},include:{user:{select:{isActive:true}}}});
    if (!row || !row.user.isActive || row.consumedAt || row.revokedAt || row.expiresAt <= now) throw new PasswordSecurityError("INVALID");
    const consumed = await tx.passwordResetToken.updateMany({where:{id:row.id,consumedAt:null,revokedAt:null,expiresAt:{gt:now}},data:{consumedAt:now}});
    if (consumed.count!==1) throw new PasswordSecurityError("INVALID");
    await tx.passwordCredential.update({where:{userId:row.userId},data:{passwordHash,algorithm:PasswordAlgorithm.ARGON2ID,mustChange:false,changedAt:now}});
    await tx.session.updateMany({where:{userId:row.userId,revokedAt:null},data:{revokedAt:now,revocationReason:SessionRevocationReason.PASSWORD_CHANGED}});
    await tx.mfaChallenge.updateMany({where:{userId:row.userId,consumedAt:null,revokedAt:null},data:{revokedAt:now}});
    await tx.passwordResetToken.updateMany({where:{userId:row.userId,id:{not:row.id},consumedAt:null,revokedAt:null},data:{revokedAt:now}});
    await tx.auditEvent.create({data:{action:"PASSWORD_RESET",resourceType:"USER",resourceId:row.userId,outcome:AuditOutcome.SUCCESS,occurredAt:now}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function changeOwnPassword(input:{userId:string;currentPassword:string;newPassword:string;totpVerified:boolean;now?:Date}):Promise<void> {
  const now = input.now??new Date();
  validatePasswordPolicy(input.newPassword);
  const credential = await db.passwordCredential.findUnique({where:{userId:input.userId},include:{user:{select:{isActive:true}}}});
  if (!credential?.user.isActive || !await verifyPassword(credential.passwordHash,input.currentPassword)) throw new PasswordSecurityError("INVALID");
  const activeMfa = await db.mfaFactor.count({where:{userId:input.userId,status:"ACTIVE"}});
  if (activeMfa>0 && !input.totpVerified) throw new PasswordSecurityError("INVALID");
  const passwordHash = await hashPassword(input.newPassword);
  await db.$transaction(async tx=>{
    const updated = await tx.passwordCredential.updateMany({where:{userId:input.userId,passwordHash:credential.passwordHash},data:{passwordHash,mustChange:false,algorithm:PasswordAlgorithm.ARGON2ID,changedAt:now}});
    if (updated.count!==1) throw new PasswordSecurityError("INVALID");
    await tx.session.updateMany({where:{userId:input.userId,revokedAt:null},data:{revokedAt:now,revocationReason:SessionRevocationReason.PASSWORD_CHANGED}});
    await tx.passwordResetToken.updateMany({where:{userId:input.userId,consumedAt:null,revokedAt:null},data:{revokedAt:now}});
    await tx.mfaChallenge.updateMany({where:{userId:input.userId,consumedAt:null,revokedAt:null},data:{revokedAt:now}});
    await tx.auditEvent.create({data:{actorUserId:input.userId,action:"PASSWORD_CHANGED",resourceType:"USER",resourceId:input.userId,outcome:AuditOutcome.SUCCESS,occurredAt:now}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

// A forced change cannot create a session or bypass the password-login throttle.
export async function changeRequiredPassword(input:{email:string;currentPassword:string;newPassword:string;origin:string;totpCode?:string;now?:Date}):Promise<void>{
  const now=input.now??new Date();
  const hashes=createLoginProtectionHashes({email:input.email,origin:input.origin});
  const throttle=await evaluateLoginThrottle(hashes,now);
  if(!throttle.allowed) throw new PasswordSecurityError("THROTTLED");
  const user=await db.user.findUnique({where:{email:normalizeEmail(input.email)},include:{passwordCredential:true}});
  if(!user?.isActive || !user.passwordCredential?.mustChange || !await verifyPassword(user.passwordCredential.passwordHash,input.currentPassword)){
    await recordLoginFailure({email:input.email,origin:input.origin},now);
    throw new PasswordSecurityError("INVALID");
  }
  const active = await db.mfaFactor.count({where:{userId:user.id,status:"ACTIVE"}});
  if(active>0){
    if(!input.totpCode) throw new PasswordSecurityError("INVALID");
    await verifyActiveTotp(user.id,input.totpCode,now);
  }
  await changeOwnPassword({userId:user.id,currentPassword:input.currentPassword,newPassword:input.newPassword,totpVerified:active>0,now});
  await recordLoginSuccess({email:input.email,origin:input.origin},user.id,now);
}
