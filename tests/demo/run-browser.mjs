// One browser file at a time, one owner per local demo server. Never starts/stops a server.
import {open,unlink} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const base=process.env.PAP_DEMO_BASE_URL||'http://127.0.0.1:3400'
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Explicit loopback demo URL required')
const lock=join(tmpdir(),`pap-demo-browser-${new URL(base).port}.lock`)
const handle=await open(lock,'wx').catch(()=>{throw Error(`Browser runner already owns ${base}; inspect ${lock}, never delete a live lock`)})
try{
 await handle.writeFile(String(process.pid))
 const response=await fetch(base+'/dashboard');if(response.status!==200)throw Error(`Demo server health: HTTP ${response.status}`)
 const navigation=process.argv.includes('--navigation')
 const files=navigation?['tests/demo/premium.browser.mjs']:['tests/demo/premium.browser.mjs','tests/demo/browser.mjs']
 for(const file of files){
  const args=['--test','--test-concurrency=1',...(navigation?['--test-name-pattern=^(B |D |E/F |F mobile)']:[]),file]
  const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit',env:{...process.env,PAP_DEMO_BASE_URL:base}});child.on('error',reject);child.on('exit',(code,signal)=>resolve(signal?1:code??1))})
  if(status!==0){process.exitCode=Number(status);break}
 }
}finally{await handle.close();await unlink(lock)}
