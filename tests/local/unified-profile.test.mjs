import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { localLabProfile, assertLocalUrl, assertLocalContainer, assertLocalVolume, assertSeparateCheckout, parseLocalArguments } from "../../scripts/local/policy.mjs";
const root=resolve(import.meta.dirname,"../..");
const p0=localLabProfile("p0-unified-rc"), legacy=localLabProfile();
test("P0 fixed profile is disjoint from every legacy resource and cannot be mutated",()=>{
  for(const key of ["database","container","volume","privateDir","dbPort","appPort","marker","keyId","user"])assert.notEqual(p0[key],legacy[key]);
  assert.throws(()=>{p0.dbPort="15432";});assert.throws(()=>localLabProfile("production"));
});
test("P0 URL boundary rejects legacy, production, ambiguous, cross-profile and socket targets",()=>{
  assert.doesNotThrow(()=>assertLocalUrl("postgresql://pap_unified:synthetic@127.0.0.1:15436/pap_p0_unified_rc?schema=public",p0.name));
  for(const value of ["postgresql://pap_unified:x@127.0.0.1:15432/pap_admin_beta1_local?schema=public","postgresql://pap_unified:x@127.0.0.1:15436/pap_admin_beta1_local?schema=public","postgresql://pap_unified:x@localhost:15436/pap_p0_unified_rc?schema=public","postgresql://pap_unified:x@vps.invalid:15436/pap_p0_unified_rc?schema=public","postgresql://pap_unified:x@127.0.0.1:5432/pap_p0_unified_rc?schema=public","postgresql://pap_unified:x@127.0.0.1:15436/pap_p0_unified_rc?schema=public&host=foreign","postgresql://pap_unified:x@127.0.0.1:15436/pap_p0_unified_rc?schema=public#fragment","postgresql://pap_local:x@127.0.0.1:15436/pap_p0_unified_rc?schema=public"])
    assert.throws(()=>assertLocalUrl(value,p0.name));
});
function container(){return{Id:"owned-p0",Config:{Labels:{"pap.local":p0.name}},HostConfig:{PortBindings:{"5432/tcp":[{HostIp:"127.0.0.1",HostPort:p0.dbPort}]}},Mounts:[{Type:"volume",Name:p0.volume,Destination:"/var/lib/postgresql/data"}],State:{Running:true}};}
test("P0 resource ownership denies legacy labels/volumes/ports, bind mounts and public bindings",()=>{
 assert.doesNotThrow(()=>assertLocalContainer(container(),p0.name));
 for(const mutate of [c=>c.Config.Labels["pap.local"]=legacy.name,c=>c.Mounts[0].Name=legacy.volume,c=>c.Mounts[0].Type="bind",c=>c.HostConfig.PortBindings["5432/tcp"][0].HostPort=legacy.dbPort,c=>c.HostConfig.PortBindings["5432/tcp"][0].HostIp="0.0.0.0"]){const c=container();mutate(c);assert.throws(()=>assertLocalContainer(c,p0.name));}
 const v={Name:p0.volume,Driver:"local",Options:{},Labels:{"pap.local":p0.name}};assert.doesNotThrow(()=>assertLocalVolume(v,p0.name));assert.throws(()=>assertLocalVolume({...v,Options:{device:"/foreign"}},p0.name));assert.throws(()=>assertLocalVolume({...v,Labels:{"pap.local":legacy.name}},p0.name));
});
test("CLI requires an explicit known P0 selector and blocks profile mixing before any operation",()=>{
 assert.equal(parseLocalArguments(["--profile=p0-unified-rc","mail","1"]).commandArgs[1],"1");assert.equal(parseLocalArguments(["init"]).profile.name,legacy.name);
 for(const args of [["--profile=","init"],["--profile=production","init"],["--profile=p0-unified-rc","--profile=admin-beta1","init"],["--profile=p0-unified-rc","reset"],["--profile=p0-unified-rc","init","extra"],["--profile=p0-unified-rc","--port=5432","start"]])assert.throws(()=>parseLocalArguments(args));
 assert.throws(()=>assertSeparateCheckout(p0.name,path=>path===legacy.privateDir));assert.throws(()=>assertSeparateCheckout(legacy.name,path=>path===p0.privateDir));
});
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),"pap-p0-profile-test-"));mkdirSync(join(dir,"scripts/local"),{recursive:true});mkdirSync(join(dir,"node_modules/pg"),{recursive:true});mkdirSync(join(dir,"node_modules/prisma/build"),{recursive:true});mkdirSync(join(dir,"node_modules/next/dist/bin"),{recursive:true});mkdirSync(join(dir,"src/lib"),{recursive:true});mkdirSync(join(dir,"bin"));
 for(const file of ["scripts/local/dev.mjs","scripts/local/policy.mjs","src/lib/local-lab-profiles.mjs"])writeFileSync(join(dir,file),readFileSync(join(root,file)));
 writeFileSync(join(dir,"package.json"),'{"type":"module"}');writeFileSync(join(dir,"node_modules/pg/package.json"),'{"type":"module","main":"index.js"}');
 writeFileSync(join(dir,"node_modules/pg/index.js"),`import fs from 'node:fs';export default {Client:class{constructor({connectionString}){const u=new URL(connectionString);if(u.hostname!=='127.0.0.1'||u.port!=='15436'||u.pathname!=='/pap_p0_unified_rc')throw Error('WRONG_DB');}async connect(){}async end(){}async query(){const s=JSON.parse(fs.readFileSync(process.env.PAP_PROFILE_STATE));return{rows:[{name:s.database||'pap_p0_unified_rc',marker:s.marker}]};}}};`);
 writeFileSync(join(dir,"node_modules/prisma/build/index.js"),`const fs=require('node:fs');const u=new URL(process.env.DATABASE_URL);if(u.port!=='15436'||u.pathname!=='/pap_p0_unified_rc'||process.env.PAP_LOCAL_PROFILE!=='p0-unified-rc'||process.env.PAP_EMAIL_EXTERNAL_ENABLED!=='0'||process.env.RESEND_API_KEY!=='')process.exit(7);fs.appendFileSync(process.env.PAP_PROFILE_TRACE,JSON.stringify({command:'prisma',args:process.argv.slice(2),database:u.pathname,port:u.port})+'\\n');`);
 symlinkSync(resolve(root,"node_modules/tsx"),join(dir,"node_modules/tsx"),"dir");
 writeFileSync(join(dir,"scripts/local/provision.ts"),`import fs from 'node:fs';if(process.argv[2]!=='iam')throw Error('NO_ADMIN_AUTOMATION');fs.appendFileSync(process.env.PAP_PROFILE_TRACE,JSON.stringify({command:'iam',profile:process.env.PAP_LOCAL_PROFILE})+'\\n');`);
 writeFileSync(join(dir,"node_modules/next/dist/bin/next"),`const fs=require("node:fs");const a=process.argv.slice(2);if(a.join(" ")!=="dev --hostname 127.0.0.1 --port 3600"||process.env.PAP_PUBLIC_URL!=="http://127.0.0.1:3600"||process.env.AUTH_ALLOWED_ORIGINS!=="http://127.0.0.1:3600"||process.env.MFA_SECRET_ENCRYPTION_KEY_ID!=="local-p0-unified-rc")process.exit(7);fs.appendFileSync(process.env.PAP_PROFILE_TRACE,JSON.stringify({command:"dev",appPort:"3600"})+"\\n");`);
 const bin=join(dir,"bin/docker");writeFileSync(bin,`#!/usr/bin/env node
import fs from 'node:fs';const a=process.argv.slice(2),f=process.env.PAP_PROFILE_STATE,s=JSON.parse(fs.readFileSync(f));if(a.some(x=>x.includes('pap-admin-beta1-local')||x==='127.0.0.1:15432:5432'))throw Error('LEGACY_RESOURCE_TOUCHED');fs.appendFileSync(process.env.PAP_PROFILE_TRACE,JSON.stringify({command:'docker',args:a})+'\\n');const save=()=>fs.writeFileSync(f,JSON.stringify(s));const output=x=>console.log(JSON.stringify(x));
if(a[0]==='context'){if(a[1]==='show')console.log('default');else output([{Endpoints:{docker:{Host:'unix:///var/run/docker.sock'}}}]);}
else if(a[1]==='inspect'){const v=a[0]==='volume'?s.volume:s.container;if(!v)process.exit(1);output([v]);}
else if(a[0]==='ps'){console.log(s.consumer||s.container?.Id||'');}
else if(a[0]==='volume'&&a[1]==='create'){s.volume={Name:'pap-p0-unified-rc-data',Driver:'local',Options:{},Labels:{'pap.local':'p0-unified-rc'}};save();}
else if(a[0]==='run'&&a.includes('--read-only'))console.log(s.contents||'empty');
else if(a[0]==='run'&&a.includes('-d')){s.container=${JSON.stringify(container())};s.contents='initialized';save();}
else if(a[0]==='start'){s.container.State.Running=true;save();}
else if(a[0]==='stop'){s.container.State.Running=false;save();}
else if(a[0]==='exec'&&a.includes('psql')){const sql=fs.readFileSync(0,'utf8');if(sql!=="COMMENT ON DATABASE pap_p0_unified_rc IS 'pap-local-p0-unified-rc';\\n")throw Error('UNEXPECTED_SQL');s.marker='pap-local-p0-unified-rc';save();}
else if(!(a[0]==='exec'&&a.includes('pg_isready')))throw Error('UNEXPECTED_DOCKER_COMMAND');
`,{mode:0o700});
 const state=join(dir,"state.json"),trace=join(dir,"trace.jsonl");writeFileSync(state,"{}");const env={...process.env,PATH:join(dir,"bin")+":"+process.env.PATH,PAP_PROFILE_STATE:state,PAP_PROFILE_TRACE:trace};for(const k of ["DATABASE_URL","NODE_ENV","DOCKER_HOST"])delete env[k];
 const cli=(command,extra={})=>spawnSync(process.execPath,["scripts/local/dev.mjs","--profile=p0-unified-rc",command],{cwd:dir,env:{...env,...extra},encoding:"utf8"});
 return{dir,state,trace,cli,read:()=>JSON.parse(readFileSync(state)),write:s=>writeFileSync(state,JSON.stringify(s)),events:()=>existsSync(trace)?readFileSync(trace,"utf8").trim().split("\n").filter(Boolean).map(x=>JSON.parse(x)):[],close:()=>rmSync(dir,{recursive:true,force:true})};
}
test("isolated launcher initializes once, preserves credentials, migrates only marked P0 and resumes without deleting data",()=>{
 const f=fixture();try{
  assert.equal(f.cli("init").status,0);const config=join(f.dir,p0.privateDir,"config.json"),first=readFileSync(config,"utf8");assert.equal(f.cli("init").status,0);assert.equal(readFileSync(config,"utf8"),first);assert.equal(existsSync(join(f.dir,legacy.privateDir)),false);
  assert.equal(f.cli("start").status,0);assert.equal(f.cli("migrate").status,0);assert.equal(f.cli("dev").status,0);assert.equal(f.cli("stop").status,0);assert.equal(f.read().container.State.Running,false);assert.equal(f.cli("start").status,0);assert.equal(f.read().marker,p0.marker);assert.equal(readFileSync(config,"utf8"),first);
  const events=f.events();assert.equal(events.filter(x=>x.command==="prisma").length,2);assert.equal(events.filter(x=>x.command==="iam").length,1);assert.equal(events.filter(x=>x.args?.includes("psql")).length,1);assert.ok(!events.some(x=>x.args?.[0]==="rm"||x.args?.includes("prune")));
 }finally{f.close();}
});
test("wrong marker and cross-profile config fail before migrations; production and .env are refused",()=>{
 const f=fixture();try{
  assert.equal(f.cli("init").status,0);assert.equal(f.cli("start").status,0);const s=f.read();s.marker="foreign";f.write(s);assert.notEqual(f.cli("migrate").status,0);assert.ok(!f.events().some(x=>x.command==="prisma"));
  const config=join(f.dir,p0.privateDir,"config.json"),c=JSON.parse(readFileSync(config));c.databaseUrl="postgresql://x:y@127.0.0.1:15432/pap_admin_beta1_local?schema=public";writeFileSync(config,JSON.stringify(c));assert.notEqual(f.cli("migrate").status,0);
  assert.notEqual(f.cli("start",{NODE_ENV:"production"}).status,0);writeFileSync(join(f.dir,".env"),"DO_NOT_TOUCH=1\n");assert.notEqual(f.cli("init").status,0);assert.equal(readFileSync(join(f.dir,".env"),"utf8"),"DO_NOT_TOUCH=1\n");
 }finally{f.close();}
});
test("legacy checkout and symlinked private directory are rejected without reading credentials or calling Docker",()=>{
 const f=fixture();try{
  mkdirSync(join(f.dir,legacy.privateDir),{recursive:true});writeFileSync(join(f.dir,legacy.privateDir,"sentinel"),"preserve");assert.notEqual(f.cli("init").status,0);assert.equal(f.events().length,0);assert.equal(existsSync(join(f.dir,p0.privateDir)),false);assert.equal(readFileSync(join(f.dir,legacy.privateDir,"sentinel"),"utf8"),"preserve");
 }finally{f.close();}
 const g=fixture();try{mkdirSync(join(g.dir,".local"));symlinkSync(join(g.dir,"not-created"),join(g.dir,p0.privateDir),"dir");assert.notEqual(g.cli("init").status,0);assert.equal(existsSync(join(g.dir,"not-created")),false);assert.equal(g.events().length,0);}finally{g.close();}
});
for(const variant of ["foreign-label","foreign-volume","other-consumer","unmarked-populated"]){test(`partial/foreign P0 resources fail closed: ${variant}`,()=>{
 const f=fixture();try{assert.equal(f.cli("init").status,0);const s={container:container(),volume:{Name:p0.volume,Driver:"local",Options:{},Labels:{"pap.local":p0.name}},contents:"initialized",marker:p0.marker};if(variant==="foreign-label")s.container.Config.Labels["pap.local"]=legacy.name;if(variant==="foreign-volume")s.container.Mounts[0].Name=legacy.volume;if(variant==="other-consumer")s.consumer="foreign-id";if(variant==="unmarked-populated"){delete s.container;s.contents="populated";}f.write(s);assert.notEqual(f.cli("start").status,0);assert.ok(!f.events().some(x=>["start","stop"].includes(x.args?.[0])||(x.args?.[0]==="run"&&x.args.includes("-d"))));}finally{f.close();}
});}

test("owned empty partial volume recovers safely; marker is never rewritten on resume",()=>{
 const f=fixture();try{assert.equal(f.cli("init").status,0);f.write({volume:{Name:p0.volume,Driver:"local",Options:{},Labels:{"pap.local":p0.name}},contents:"empty"});assert.equal(f.cli("start").status,0);assert.equal(f.read().marker,p0.marker);assert.equal(f.cli("stop").status,0);assert.equal(f.cli("start").status,0);assert.equal(f.events().filter(x=>x.args?.includes("psql")).length,1);}finally{f.close();}
});
test("private env-file symlink and inherited Docker remote context are blocked before resource access",()=>{
 const f=fixture();try{assert.equal(f.cli("init").status,0);assert.notEqual(f.cli("start",{DOCKER_HOST:"ssh://vps.invalid"}).status,0);assert.equal(f.events().length,0);const sentinel=join(f.dir,"sentinel");writeFileSync(sentinel,"preserve");symlinkSync(sentinel,join(f.dir,p0.privateDir,"postgres.env"));assert.notEqual(f.cli("start").status,0);assert.equal(readFileSync(sentinel,"utf8"),"preserve");assert.equal(f.events().length,0);}finally{f.close();}
});

test("independent P0 setups generate new random secrets and never inherit production key values",()=>{
 const a=fixture(),b=fixture();try{
  assert.equal(a.cli("init",{MFA_SECRET_ENCRYPTION_KEY:"DO_NOT_REUSE",RESEND_API_KEY:"DO_NOT_REUSE"}).status,0);assert.equal(b.cli("init").status,0);
  const c1=JSON.parse(readFileSync(join(a.dir,p0.privateDir,"config.json"))),c2=JSON.parse(readFileSync(join(b.dir,p0.privateDir,"config.json")));assert.ok(c1.mfaKey!==c2.mfaKey&&c1.mfaKey!=="DO_NOT_REUSE");assert.ok(new URL(c1.databaseUrl).password!==new URL(c2.databaseUrl).password);assert.equal(Buffer.from(c1.mfaKey,"base64url").length,32);
 }finally{a.close();b.close();}
});
