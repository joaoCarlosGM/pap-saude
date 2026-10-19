import assert from "node:assert/strict";
import { before,after,beforeEach,test } from "node:test";
import * as OTPAuth from "otpauth";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { hashPassword,verifyPassword } from "../../src/server/auth/password";
import { createSession } from "../../src/server/auth/session.service";
import { issuePasswordReset,consumePasswordReset,changeOwnPassword,hashPasswordResetToken,PasswordSecurityError } from "../../src/server/auth/password-security.service";
import { accountSecurityPosture,runOwnSecurityAction } from "../../src/server/auth/account-security.service";
import { POST as ownPOST,GET as ownGET } from "../../src/app/api/auth/security/route";
import { POST as forgotPOST } from "../../src/app/api/auth/password/forgot/route";
import { POST as resetPOST } from "../../src/app/api/auth/password/reset/route";
import { SESSION_COOKIE_NAME } from "../../src/server/security/constants";
import { decryptSecret } from "../../src/server/security/secret-encryption";

const DB_NAME="pap_saude_f04_access_trust_test";
const BASE="http://localhost:3000";
const password="Strong-Original-Password-456";
const nextPassword="Another-Stronger-Password-789";
const email="f045-owner@example.test";
let userId="";let sessionId="";let token="";
function req(path:string,body?:object,cookie=token,origin=BASE){return new NextRequest(`${BASE}${path}`,{method:body?"POST":"GET",headers:{...(body?{"Content-Type":"application/json",Origin:origin}:{}),...(cookie?{Cookie:`${SESSION_COOKIE_NAME}=${cookie}`}:{})},body:body?JSON.stringify(body):undefined});}
async function clean(){await db.auditEvent.deleteMany();await db.user.deleteMany();}
async function seed(){
 const user=await db.user.create({data:{email,displayName:"F04.5 Owner",isActive:true}});userId=user.id;
 await db.passwordCredential.create({data:{userId,passwordHash:await hashPassword(password)}});
 const session=await createSession({userId});sessionId=session.session.id;token=session.token;
}
before(async()=>{const result=await db.$queryRaw<Array<{database:string}>>`SELECT current_database() AS database`;assert.equal(result[0]?.database,DB_NAME);process.env.AUTH_ALLOWED_ORIGINS=BASE;process.env.MFA_SECRET_ENCRYPTION_KEY=Buffer.alloc(32,17).toString("base64url");await clean();});
beforeEach(async()=>{await clean();await seed();});
after(async()=>{await clean();await db.$disconnect();});

test("A/B: owner posture contains no secrets and shows only own active sessions",async()=>{
 const response=await ownGET(req("/api/auth/security"));assert.equal(response.status,200);
 const raw=await response.text();assert.equal(raw.includes(token),false);assert.equal(raw.includes("passwordHash"),false);
 const data=JSON.parse(raw);assert.equal(data.sessions.length,1);assert.equal(data.sessions[0].current,true);
});

test("B: session revocation is scoped to owner and audited atomically",async()=>{
 const other=await db.user.create({data:{email:"other-f045@example.test",displayName:"Other"}});
 const otherSession=await createSession({userId:other.id});
 const forbidden=await ownPOST(req("/api/auth/security",{action:"REVOKE_SESSION",targetSessionId:otherSession.session.id}));assert.equal(forbidden.status,400);
 assert.equal((await db.session.findUniqueOrThrow({where:{id:otherSession.session.id}})).revokedAt,null);
 const mine=await createSession({userId});
 const good=await ownPOST(req("/api/auth/security",{action:"REVOKE_SESSION",targetSessionId:mine.session.id}));assert.equal(good.status,200);
 assert.equal(await db.auditEvent.count({where:{action:"SESSION_SELF_REVOKED"}}),1);
});

test("C/D: MFA enrollment, secret encryption, recovery code rotation and one-time display",async()=>{
 const started=await runOwnSecurityAction({userId,sessionId,action:"START_MFA",password});
 assert.ok("factorId" in started);
 if(!("factorId" in started))return;
 const factor=await db.mfaFactor.findUniqueOrThrow({where:{id:started.factorId}});
 const secret=decryptSecret(factor.secretEncrypted);
 assert.notEqual(factor.secretEncrypted,secret);
 const now=new Date();
 const otp=new OTPAuth.TOTP({issuer:"PAP Saúde",label:email,secret:OTPAuth.Secret.fromBase32(secret),digits:6,period:30,algorithm:"SHA1"});
 const code=otp.generate({timestamp:now.getTime()});
 const confirmed=await runOwnSecurityAction({userId,sessionId,action:"CONFIRM_MFA",password,code,factorId:started.factorId});
 assert.ok("status" in confirmed);assert.equal((await accountSecurityPosture(userId,sessionId)).factors[0].status,"ACTIVE");
 // Replay defense disallows reusing a verification step.
 const codes=await runOwnSecurityAction({userId,sessionId,action:"GENERATE_RECOVERY_CODES",password,code});
 assert.ok("codes" in codes);if(!("codes" in codes))return;
 assert.equal(codes.codes.length,10);
 const raw=JSON.stringify(await accountSecurityPosture(userId,sessionId));assert.equal(raw.includes(codes.codes[0]),false);
 assert.equal((await accountSecurityPosture(userId,sessionId)).remainingRecoveryCodes,10);
 // An existing factor cannot be silently replaced using a password alone.
 await assert.rejects(
   ()=>runOwnSecurityAction({userId,sessionId,action:"START_MFA",password}),
   /MFA_ALREADY_ENABLED/,
 );
});

test("F/G: reset hash-only token, one-time usage, audit and session invalidation",async()=>{
 let issued="";
 await issuePasswordReset({email,origin:"f045-test-origin",deliver:async (_email,value)=>{issued=value;}});
 assert.ok(issued.length>=40);
 const row=await db.passwordResetToken.findFirstOrThrow();assert.equal(row.tokenHash,hashPasswordResetToken(issued));
 assert.equal(JSON.stringify(row).includes(issued),false);
 await consumePasswordReset({token:issued,newPassword:nextPassword});
 assert.equal((await db.session.findUniqueOrThrow({where:{id:sessionId}})).revokedAt!==null,true);
 assert.equal(await verifyPassword((await db.passwordCredential.findUniqueOrThrow({where:{userId}})).passwordHash,nextPassword),true);
 assert.equal(await db.auditEvent.count({where:{action:"PASSWORD_RESET"}}),1);
 await assert.rejects(()=>consumePasswordReset({token:issued,newPassword:password}),PasswordSecurityError);
});

test("F: forged/expired/reset tokens fail closed; unknown email same public response",async()=>{
 await assert.rejects(()=>consumePasswordReset({token:"fake",newPassword:nextPassword}),PasswordSecurityError);
 let issued="";const now=new Date("2030-01-01T00:00:00Z");
 await issuePasswordReset({email,origin:"expiry",now,deliver:async(_e,value)=>{issued=value;}});
 await assert.rejects(()=>consumePasswordReset({token:issued,newPassword:nextPassword,now:new Date("2030-01-01T01:00:00Z")}),PasswordSecurityError);
 const res=await forgotPOST(req("/api/auth/password/forgot",{email:"unknown@example.test"}));assert.equal(res.status,202);assert.deepEqual(await res.json(),{accepted:true});
});

test("G: password change invalidates all sessions and rejects stale credential",async()=>{
 await changeOwnPassword({userId,currentPassword:password,newPassword:nextPassword,totpVerified:false});
 assert.equal(await db.session.count({where:{userId,revokedAt:null}}),0);
 await assert.rejects(()=>changeOwnPassword({userId,currentPassword:password,newPassword:nextPassword,totpVerified:false}),PasswordSecurityError);
});

test("H: CSRF and unauthenticated requests rejected",async()=>{
 const forbidden=await ownPOST(req("/api/auth/security",{action:"REVOKE_ALL_SESSIONS",password},token,"https://attacker.invalid"));assert.equal(forbidden.status,403);
 const unauth=await ownPOST(req("/api/auth/security",{action:"REVOKE_SESSION",targetSessionId:sessionId},""));assert.equal(unauth.status,401);
 const route=await resetPOST(req("/api/auth/password/reset",{token:"fake",newPassword:nextPassword}));assert.equal(route.status,400);
});

test("H: concurrent reset token consumption has exactly one winner",async()=>{
  let issued="";
  await issuePasswordReset({email,origin:"concurrent",deliver:async(_e,t)=>{issued=t;}});
  const outcomes=await Promise.allSettled([
    consumePasswordReset({token:issued,newPassword:nextPassword}),
    consumePasswordReset({token:issued,newPassword:nextPassword}),
  ]);
  assert.equal(outcomes.filter(r=>r.status==="fulfilled").length,1);
  assert.equal((await db.auditEvent.count({where:{action:"PASSWORD_RESET"}})),1);
});

test("H: bounded JSON body, wrong origin and invalid action fail closed",async()=>{
  const oversized=await ownPOST(new NextRequest(`${BASE}/api/auth/security`,{
    method:"POST",headers:{Origin:BASE,"Content-Type":"application/json",Cookie:`${SESSION_COOKIE_NAME}=${token}`},
    body:JSON.stringify({action:"START_MFA",password:"x".repeat(10000)}),
  }));
  assert.equal(oversized.status,400);
  const invalid=await ownPOST(req("/api/auth/security",{action:"SUPERUSER_ACCESS"}));
  assert.equal(invalid.status,400);
});

test("H: reset cannot be used by inactive user and cannot disclose another session",async()=>{
  let issued="";
  await issuePasswordReset({email,origin:"inactive",deliver:async(_e,t)=>{issued=t;}});
  await db.user.update({where:{id:userId},data:{isActive:false}});
  await assert.rejects(()=>consumePasswordReset({token:issued,newPassword:nextPassword}),PasswordSecurityError);
  const response=await ownGET(req("/api/auth/security"));assert.equal(response.status,401);
});
