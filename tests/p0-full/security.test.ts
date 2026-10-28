import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { issueLoginCaptcha, verifyLoginCaptcha, CaptchaError } from "../../src/server/auth/login-captcha.service";
import { fixture } from "../first-access/fixtures";
import { actor, request } from "../mission04-b/fixtures";
import { requireHttpSession } from "../../src/server/http/http-auth.guard";
import { firstAccessState, runFirstAccessAction } from "../../src/server/auth/first-access.service";
import { resolveLoginNavigation } from "../../src/server/auth/login-navigation.service";
import { requireCommercialSession } from "../../src/server/demo/commercial-access.service";
import { createSession } from "../../src/server/auth/session.service";
import { issuePasswordReset, consumePasswordReset } from "../../src/server/auth/password-security.service";
import { authenticateLogin } from "../../src/server/auth/login.service";
import { completeMfaLoginWithRecoveryCode } from "../../src/server/auth/mfa-login.service";
function solve(question?: string) { const parts = question!.match(/\d+/g)!.map(Number); return String(parts[0] * parts[1]); }
before(async () => { assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/pap_p0_full_tests"); await bootstrapSystemIam(); });
after(() => db.$disconnect());
test("CAPTCHA stores only salted hashes, returns no answer and consumes correct response exactly once under concurrency", async () => {
 const origin="captcha-good", issued=await issueLoginCaptcha(origin,true), answer=solve(issued.public.question);
 assert.ok(!Object.keys(issued.public).includes("answer")); const entries=await db.betaAbuseBucket.findMany({where:{key:{startsWith:"captcha:v1:"}}}); assert.ok(entries.every(r=>!r.key.includes(answer)));
 const input={id:issued.public.id,answer,binding:issued.binding,origin}; const outcomes=await Promise.allSettled(Array.from({length:8},()=>verifyLoginCaptcha(input)));assert.equal(outcomes.filter(x=>x.status==="fulfilled").length,1);
 await assert.rejects(verifyLoginCaptcha(input),CaptchaError);
});
test("CAPTCHA denies wrong origin, missing cookie, expiry and wrong answer; wrong answer spends the challenge", async () => {
 const origin="captcha-negative", issued=await issueLoginCaptcha(origin,true), answer=solve(issued.public.question), input={id:issued.public.id,answer,binding:issued.binding,origin};
 await assert.rejects(verifyLoginCaptcha({...input,origin:"foreign"}),CaptchaError); await assert.rejects(verifyLoginCaptcha({...input,binding:undefined}),CaptchaError);
 await assert.rejects(verifyLoginCaptcha({...input,answer:"WRONG"}),CaptchaError); await assert.rejects(verifyLoginCaptcha(input),CaptchaError);
 const expired=await issueLoginCaptcha(origin,true,new Date(Date.now()-180000));await assert.rejects(verifyLoginCaptcha({...input,id:expired.public.id,binding:expired.binding,answer:solve(expired.public.question)}),CaptchaError);
});
test("visual CAPTCHA is PNG bytes, never SVG/HTML/plaintext; issuer rate limit is persistent", async () => {
 const issued=await issueLoginCaptcha("captcha-visual"); assert.ok(issued.public.image?.startsWith("data:image/png;base64,"));assert.equal(issued.public.question,undefined);const png=Buffer.from(issued.public.image!.split(",")[1],"base64");assert.equal(png.subarray(1,4).toString(),"PNG");assert.ok(!png.includes(Buffer.from("<text")));
 const origin="captcha-limit";await db.betaAbuseBucket.create({data:{key:(await import("../../src/server/security/crypto")).sha256(`captcha-limit:v1:${origin}:${Math.floor(Date.now()/600000)}`),count:30,expiresAt:new Date(Date.now()+600000)}});await assert.rejects(issueLoginCaptcha(origin,true),CaptchaError);
});
test("all roles require current-session MFA, while own enrollment remains available and deferral is denied", async () => {
 for(const role of ["PAP_ADMIN","HEALTH_UNIT_ADMIN","PROFESSIONAL"] as const){const f=await fixture(role);await assert.rejects(requireHttpSession(request("/api/clinical/patients",f.session.token)));assert.equal((await requireHttpSession(request("/api/auth/security",f.session.token),{ownSecuritySetup:true})).user.id,f.user.id);assert.equal((await firstAccessState(f.user.id,f.session.session.id)).mfaRequired,true);await assert.rejects(runFirstAccessAction(f.user.id,f.session.session.id,"DEFER_OPTIONAL_MFA"));assert.deepEqual(await resolveLoginNavigation(f.session.token),{view:"REDIRECT",destination:"/primeiros-passos"});}
});
test("Commercial cannot use a primary session, factorless old session, stale proof or revoked factor", async () => {
 const f=await actor("COMMERCIAL");assert.equal((await requireCommercialSession(f.token)).userId,f.user.id);const primary=await createSession({userId:f.user.id});await assert.rejects(requireCommercialSession(primary.token));await assert.rejects(requireHttpSession(request("/api/clinical/patients",primary.token)));await db.mfaFactor.updateMany({where:{userId:f.user.id,status:"ACTIVE"},data:{status:"REVOKED",revokedAt:new Date()}});await assert.rejects(requireCommercialSession(f.token));await assert.rejects(requireHttpSession(request("/api/clinical/patients",f.token)));
});
test("reset keeps factors, revokes sessions, consumes token and requires MFA on the next login", async () => {
 const f=await actor("COMMERCIAL"), factors=await db.mfaFactor.findMany({where:{userId:f.user.id}});let token="";await issuePasswordReset({email:f.user.email,origin:"p0-reset",deliver:async(_email,value)=>{token=value;}});assert.ok(token);const newPassword="Synthetic-independent-password-928!";await consumePasswordReset({token,newPassword});await assert.rejects(consumePasswordReset({token,newPassword}));assert.deepEqual(await db.mfaFactor.findMany({where:{userId:f.user.id}}),factors);await assert.rejects(requireCommercialSession(f.token));const login=await authenticateLogin({email:f.user.email,password:newPassword,origin:"p0-reset-login"});assert.equal(login.status,"MFA_REQUIRED");if(login.status!=="MFA_REQUIRED")throw Error("Expected challenge");const verified=await completeMfaLoginWithRecoveryCode({challengeToken:login.challengeToken,recoveryCode:f.codes[1]});assert.equal((await requireCommercialSession(verified.sessionToken)).userId,f.user.id);
});
test("HTTP login fails closed without CAPTCHA and a valid challenge only creates enrollment-level access", async () => {
 const {POST:login}=await import("../../src/app/api/auth/login/route"),{POST:issue}=await import("../../src/app/api/auth/login/verification/route");const f=await fixture("PROFESSIONAL");
 assert.equal((await login(request("/api/auth/login",undefined,{email:f.user.email,password:f.password}))).status,400);
 const issued=await issue(request("/api/auth/login/verification",undefined,{accessible:true}));assert.equal(issued.status,200);const body=await issued.json();const cookie=issued.cookies.get("pap_login_verification")!.value;
 const result=await login(request("/api/auth/login",undefined,{email:f.user.email,password:f.password,verificationId:body.id,verificationAnswer:solve(body.question)},"POST",{cookie:`pap_login_verification=${cookie}`}));assert.equal(result.status,200);const session=result.cookies.get("pap_session")!.value;
 assert.equal((await resolveLoginNavigation(session)).view,"REDIRECT");await assert.rejects(requireHttpSession(request("/api/clinical/patients",session)));
 assert.equal((await login(request("/api/auth/login",undefined,{email:f.user.email,password:f.password,verificationId:body.id,verificationAnswer:solve(body.question)},"POST",{cookie:`pap_login_verification=${cookie}`}))).status,400);
});
