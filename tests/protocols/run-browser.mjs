// Presentation-only fixture: no production auth route, database, migration, account or Docker.
import {mkdtemp,cp,writeFile,symlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import net from 'node:net';import {spawn} from 'node:child_process';import {openSync,closeSync} from 'node:fs';import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
const integrated=process.argv.includes('--integrated');
const root=process.cwd(),run=await mkdtemp(path.join(tmpdir(),'pap-protocols-ui-')),app=path.join(run,'app-fixture');await mkdir(app);
await cp('tests/protocols/fixture',app,{recursive:true});if(integrated)await cp('tests/pap-id/fixture',app,{recursive:true});await symlink(path.join(root,'node_modules'),path.join(app,'node_modules'));await symlink(path.join(root,'public'),path.join(app,'public'));
await writeFile(path.join(app,'package.json'),JSON.stringify({private:true,scripts:{}}));
await writeFile(path.join(app,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2017',lib:['dom','esnext'],jsx:'react-jsx',strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true,module:'esnext',moduleResolution:'bundler',resolveJsonModule:true,allowJs:true,plugins:[{name:'next'}],paths:{'@/*':[path.join(root,'src/*')]}}}));
await cp('src/app/fonts',path.join(app,'app/fonts'),{recursive:true});
await cp('postcss.config.mjs',path.join(app,'postcss.config.mjs'));
await writeFile(path.join(app,'next.config.mjs'),`export default {devIndicators:false,experimental:{externalDir:true},webpack(config){config.resolve.alias['@']=${JSON.stringify(path.join(root,'src'))};return config}};`);
await writeFile(path.join(app,'app/globals.css'),`@import "${root}/src/app/globals.css";\n@source "${root}/src";\n`);
const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const base=`http://127.0.0.1:${port}`,env={...process.env,PAP_PRIVATE_REVIEW:integrated?'1':'0',PAP_PRIVATE_REVIEW_ROOT:root,PAP_PRIVATE_REVIEW_ORIGIN:`http://127.0.0.1:${port}`,PAP_PRIVATE_REVIEW_SECRET:randomBytes(32).toString('hex'),PAP_PRIVATE_REVIEW_EXPIRES:String(Date.now()+7200000),DATABASE_URL:'postgresql://no_connection:unused@127.0.0.1:1/protocols_no_database',PAP_EMAIL_PROVIDER:'disabled',PAP_EMAIL_EXTERNAL_ENABLED:'0',NEXT_TELEMETRY_DISABLED:'1',PAP_PROTOCOLS_RUN_DIR:run,PAP_PROTOCOLS_BASE_URL:base,PAP_PROTOCOLS_EVIDENCE:process.env.PAP_PROTOCOLS_EVIDENCE||path.join(run,'evidence')};
await mkdir(env.PAP_PROTOCOLS_EVIDENCE,{recursive:true});
console.log(`PRESENTATION_ONLY ${base}; logs=${run}; operational database unavailable by construction; owned synthetic registry only when PAP_ID_REVIEW_PROFILE is supplied`);
const out=openSync(path.join(run,'server.log'),'w'),err=openSync(path.join(run,'server-error.log'),'w');
const server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev',app,'--webpack','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore',out,err]});
closeSync(out);closeSync(err);
try{
 let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw new Error('fixture server exited');try{const r=await fetch(base+'/vitrine/protocolos',{signal:AbortSignal.timeout(5000)});if(r.status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}if(!ready)throw new Error('fixture startup failed; inspect private log');
 if(process.argv.includes('--serve')){console.log(`Preview sintético: ${base}/vitrine/protocolos (Ctrl+C encerra somente esta fixture).`);await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve)});}
 else {const child=spawn(process.execPath,[path.join(root,'node_modules/@playwright/test/cli.js'),'test','--config',integrated?'tests/pap-id/playwright.config.ts':'tests/protocols/playwright.config.ts',...process.argv.slice(2).filter(arg=>arg!=='--integrated')],{env,stdio:'inherit'});const [code]=await once(child,'exit');process.exitCode=code===null?1:code;}
}finally{server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,5000))]);if(server.exitCode===null)server.kill('SIGKILL')}
