import assert from "node:assert/strict";
import { test, after, beforeEach, afterEach, mock } from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { db } from "../../src/server/db/client";
import { assertLocalDatabase } from "../../scripts/local/provision";
import { captureLocalDemoMail } from "../../src/server/email/local-demo-mail";
import { mailProvider } from "../../src/server/email/email-config";
import { operatorMailProfile } from "../../src/lib/local-lab-profiles.mjs";
const saved = { ...process.env }, cwd = process.cwd();
const originalQuery = db.$queryRaw;
function stubQuery(initial: () => Promise<unknown>) {
 let implementation = initial, calls = 0;
 assert.equal(Reflect.set(db, "$queryRaw", () => { calls++; return implementation(); }), true);
 return { mock: { callCount: () => calls, mockImplementation: (next: () => Promise<unknown>) => { implementation = next; } } };
}
const p0 = {NODE_ENV:"development",DATABASE_URL:"postgresql://pap_unified:synthetic@127.0.0.1:15436/pap_p0_unified_rc?schema=public",PAP_LOCAL_PROFILE:"p0-unified-rc",PAP_LOCAL_DEMO:"1",PAP_EMAIL_PROVIDER:"local-demo",PAP_PUBLIC_URL:"http://127.0.0.1:3600",PAP_LOCAL_DEMO_TEST:"0",PAP_LOCAL_MAIL_TEST_DIR:"",PAP_EMAIL_EXTERNAL_ENABLED:"0",RESEND_API_KEY:""};
beforeEach(()=>Object.assign(process.env,p0));
afterEach(()=>{Reflect.set(db,"$queryRaw",originalQuery);mock.restoreAll();process.chdir(cwd);for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);});
after(()=>db.$disconnect());
test("bootstrap P0 requires the exact database and marker before any IAM or account operation",async()=>{
 const query=stubQuery(async()=>[{name:"pap_p0_unified_rc",marker:"pap-local-p0-unified-rc"}]);
 await assert.doesNotReject(assertLocalDatabase());assert.equal(query.mock.callCount(),1);
 for(const databaseUrl of ["postgresql://u:p@127.0.0.1:15432/pap_admin_beta1_local?schema=public","postgresql://pap_unified:p@vps.invalid:15436/pap_p0_unified_rc?schema=public"]){process.env.DATABASE_URL=databaseUrl;await assert.rejects(assertLocalDatabase());}
 assert.equal(query.mock.callCount(),1);
});
test("bootstrap rejects an old/foreign marker despite the P0 URL; legacy default remains compatible",async()=>{
 const query=stubQuery(async()=>[{name:"pap_p0_unified_rc",marker:"pap-local-admin-beta1"}]);await assert.rejects(assertLocalDatabase(),/MARKER/);
 query.mock.mockImplementation(async()=>[{name:"pap_admin_beta1_local",marker:"pap-local-admin-beta1"}]);delete process.env.PAP_LOCAL_PROFILE;process.env.DATABASE_URL="postgresql://pap_local:synthetic@127.0.0.1:15432/pap_admin_beta1_local?schema=public";await assert.doesNotReject(assertLocalDatabase());
});
test("bootstrap rejects production before even querying the mocked database",async()=>{
 const query=stubQuery(async()=>[]);Object.assign(process.env,{NODE_ENV:"production"});await assert.rejects(assertLocalDatabase());assert.equal(query.mock.callCount(),0);
});
test("P0 local-demo captures only into its independent private directory with no network",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"pap-p0-mail-unit-"));const fetch=mock.method(globalThis,"fetch",async()=>{throw new Error("NETWORK_FORBIDDEN");});
 try{process.chdir(dir);await captureLocalDemoMail({to:"operator-test@synthetic.invalid",subject:"Synthetic invitation",text:"Local demonstration only",html:"<p>Local only</p>",messageId:"p0-unit"});const files=await readdir(join(dir,".local/pap-p0-unified-rc/mail"));assert.equal(files.length,2);await assert.rejects(readdir(join(dir,".local/pap-admin")));assert.equal(fetch.mock.callCount(),0);}finally{process.chdir(cwd);await rm(dir,{recursive:true,force:true});}
});
test("P0 mail refuses mixed checkouts and symlink ancestors without changing the legacy sentinel",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"pap-p0-mail-protect-"));try{process.chdir(dir);await mkdir(".local/pap-admin",{recursive:true});await writeFile(".local/pap-admin/sentinel","preserve");await assert.rejects(captureLocalDemoMail({to:"synthetic@synthetic.invalid",subject:"Synthetic",text:"Local",html:"<p>Local</p>"}));assert.equal(await readFile(".local/pap-admin/sentinel","utf8"),"preserve");await assert.rejects(readdir(".local/pap-p0-unified-rc"));}finally{process.chdir(cwd);await rm(dir,{recursive:true,force:true});}
 const dir2=await mkdtemp(join(tmpdir(),"pap-p0-mail-link-"));try{process.chdir(dir2);await mkdir("target");await mkdir(".local");await symlink(join(dir2,"target"),".local/pap-p0-unified-rc");await assert.rejects(captureLocalDemoMail({to:"synthetic@synthetic.invalid",subject:"Synthetic",text:"Local",html:"<p>Local</p>"}));assert.deepEqual(await readdir("target"),[]);}finally{process.chdir(cwd);await rm(dir2,{recursive:true,force:true});}
});
test("P0 Resend cannot be enabled by production-style sender/host flags or removing the demo flag",()=>{
 const fetch=mock.method(globalThis,"fetch",async()=>{throw new Error("NETWORK_FORBIDDEN");});Object.assign(process.env,{PAP_EMAIL_PROVIDER:"resend",PAP_LOCAL_DEMO:"0",PAP_EMAIL_EXTERNAL_ENABLED:"1",RESEND_API_KEY:"synthetic-not-live",PAP_EMAIL_FROM:"test@synthetic.invalid",PAP_EMAIL_ALLOWED_SENDERS:"test@synthetic.invalid",PAP_EMAIL_ALLOWED_HOSTS:"release.example.org",PAP_PUBLIC_URL:"https://release.example.org"});assert.throws(()=>mailProvider());delete process.env.PAP_LOCAL_PROFILE;assert.throws(()=>mailProvider());assert.equal(fetch.mock.callCount(),0);
});
test("mail boundaries retain the legacy tuple and reject cross-profile, production and unknown selectors",()=>{
 assert.equal(operatorMailProfile(p0)?.name,"p0-unified-rc");
 const legacy={...p0,DATABASE_URL:"postgresql://pap_local:synthetic@127.0.0.1:15432/pap_admin_beta1_local?schema=public",PAP_PUBLIC_URL:"http://127.0.0.1:3100"};delete (legacy as Partial<typeof p0>).PAP_LOCAL_PROFILE;assert.equal(operatorMailProfile(legacy)?.name,"admin-beta1");
 for(const env of [{...p0,NODE_ENV:"production"},{...p0,PAP_PUBLIC_URL:"http://127.0.0.1:3100"},{...p0,PAP_LOCAL_PROFILE:"unknown"},{...p0,DATABASE_URL:legacy.DATABASE_URL}])assert.equal(operatorMailProfile(env),null);
});
