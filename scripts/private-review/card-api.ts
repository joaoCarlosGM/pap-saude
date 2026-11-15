import {authorized} from './documents';import {readProfile,connect,ledgers,issue,revoke} from './card-store';
import {cardImage} from './card-image';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
const rates=new Map<string,{count:number;until:number}>()
export async function cardResponse(request:Request){
 if(!authorized(request)||!process.env.PAP_ID_REVIEW_PROFILE)return Response.json({error:'LOCAL_REVIEW_REQUIRED'},{status:403,headers})
 if(new URL(request.url).search)return new Response(null,{status:404,headers})
 if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers})
 if(request.method==='POST'&&(request.headers.get('origin')!==process.env.PAP_PRIVATE_REVIEW_ORIGIN||request.headers.get('x-pap-local-review')!=='cards'))return new Response(null,{status:403,headers})
 // Per private consent session; no client IP/forwarded header is trusted.
 const key=request.headers.get('cookie')||'';const rate=rates.get(key);if(rate&&rate.until>Date.now()&&rate.count>=60)return Response.json({error:'LOCAL_RATE_LIMIT'},{status:429,headers});if(!rate||rate.until<=Date.now())rates.set(key,{count:1,until:Date.now()+60000});else rate.count++
 let pool:ReturnType<typeof connect>|undefined
 try{const p=await readProfile(process.env.PAP_ID_REVIEW_PROFILE);pool=connect(p)
 if(request.method==='GET')return Response.json({ledgers:await ledgers(pool)},{headers})
 if(Number(request.headers.get('content-length')||0)>2048)return new Response(null,{status:413,headers});const raw=await request.text();if(raw.length>2048)return new Response(null,{status:413,headers});const data=JSON.parse(raw)
 if(data.action==='revoke'&&Object.keys(data).sort().join(',')==='action,subject'&&/^[a-f0-9-]{36}$/.test(data.subject)){await revoke(pool,data.subject);return Response.json({ledgers:await ledgers(pool)},{headers})}
 if(data.action!=='issue'||Object.keys(data).sort().join(',')!=='action,operationId,patientId,token')return new Response(null,{status:400,headers})
 const ledger=await issue(pool,data.patientId,data.operationId,data.token);return Response.json({ledger,png:'data:image/png;base64,'+(await cardImage(ledger,data.token)).toString('base64')},{headers})
 }catch{return Response.json({error:'LOCAL_CARD_OPERATION_UNCONFIRMED'},{status:409,headers})}finally{await pool?.end()}
}
