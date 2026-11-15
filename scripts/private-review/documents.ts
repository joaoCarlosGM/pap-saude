import {readFile} from 'node:fs/promises';import {createHash,randomBytes} from 'node:crypto';import {join} from 'node:path';
import {originalDocuments} from '../../src/features/vitrine-premium/lib/protocol-originals';
const cookie='pap_private_document_review';
export function privateChecks(request:Request){
 const origin=process.env.PAP_PRIVATE_REVIEW_ORIGIN||'',loopback=/^http:\/\/127\.0\.0\.1:\d+$/.test(origin),expected=loopback?new URL(origin):null,url=new URL(request.url)
 // Next normalizes its internal Request URL to localhost. The original Host, exact browser
 // Origin and configured ephemeral port still have to match; forwarded/IP headers are ignored.
 return {enabled:process.env.PAP_PRIVATE_REVIEW==='1',loopback,url:url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)&&url.port===expected?.port,host:request.headers.get('host')===expected?.host,origin:!request.headers.get('origin')||request.headers.get('origin')===origin,site:!['cross-site','same-site'].includes(request.headers.get('sec-fetch-site')||'')}
}
export function privateOrigin(request:Request){return Object.values(privateChecks(request)).every(Boolean)}
type LocalSession={expiresAt:number}
const local=globalThis as typeof globalThis&{__papPrivateReviewSessions?:Map<string,LocalSession>}
function sessions(){return local.__papPrivateReviewSessions??=new Map()}
function sessionKey(request:Request){const nonce=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookie+'='))?.slice(cookie.length+1)||'';return /^[a-f0-9]{64}$/.test(nonce)?createHash('sha256').update((process.env.PAP_PRIVATE_REVIEW_SECRET||'')+nonce).digest('hex'):''}
export function authorized(request:Request){
 if(!privateOrigin(request)||!Number.isSafeInteger(Number(process.env.PAP_PRIVATE_REVIEW_EXPIRES))||Date.now()>=Number(process.env.PAP_PRIVATE_REVIEW_EXPIRES))return false
 const entry=sessions().get(sessionKey(request));return !!entry&&entry.expiresAt>Date.now()
}
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin','X-Robots-Tag':'noindex, nofollow'}
export async function session(request:Request){
 if(!privateOrigin(request))return Response.json({error:'LOCAL_REVIEW_DISABLED',checks:privateChecks(request)},{status:403,headers:{...headers,'X-PAP-Review-Denial':JSON.stringify(privateChecks(request))}})
 if(request.method==='POST'){
  if(request.headers.get('origin')!==process.env.PAP_PRIVATE_REVIEW_ORIGIN||request.headers.get('x-pap-local-review')!=='consent')return Response.json({error:'ORIGIN_DENIED'},{status:403,headers:{...headers,'X-PAP-Review-Denial':'explicit-origin-or-consent-header'}})
  const body=await request.json().catch(()=>null);if(!body||body.consent!==true||Object.keys(body).length!==1)return Response.json({error:'CONSENT_REQUIRED'},{status:400,headers})
  if(!/^[a-f0-9]{64}$/.test(process.env.PAP_PRIVATE_REVIEW_SECRET||'')||(!Number.isSafeInteger(Number(process.env.PAP_PRIVATE_REVIEW_EXPIRES))||Date.now()>=Number(process.env.PAP_PRIVATE_REVIEW_EXPIRES)))return Response.json({error:'REVIEW_EXPIRED'},{status:403,headers})
  // Verify all documents before enabling any capability. No consent grants public distribution rights.
  try{for(const d of originalDocuments)await verifiedBytes(d.slug)}catch{return Response.json({error:'DOCUMENT_INTEGRITY_FAILED'},{status:503,headers})}
  for(const [key,entry]of sessions())if(entry.expiresAt<=Date.now())sessions().delete(key);sessions().delete(sessionKey(request));if(sessions().size>=100)return Response.json({error:'LOCAL_REVIEW_LIMIT'},{status:429,headers});
  const nonce=randomBytes(32).toString('hex');sessions().set(createHash('sha256').update(process.env.PAP_PRIVATE_REVIEW_SECRET!+nonce).digest('hex'),{expiresAt:Math.min(Date.now()+7200000,Number(process.env.PAP_PRIVATE_REVIEW_EXPIRES))});
  return Response.json({enabled:true,documents:capabilities()},{headers:{...headers,'Set-Cookie':`${cookie}=${nonce}; Path=/homologacao; HttpOnly; SameSite=Strict; Max-Age=7200`}})
 }
 if(request.method==='GET')return Response.json(authorized(request)?{enabled:true,documents:capabilities()}:{enabled:false,documents:[]},{headers})
 if(request.method==='DELETE'){
  if(request.headers.get('origin')!==process.env.PAP_PRIVATE_REVIEW_ORIGIN||request.headers.get('x-pap-local-review')!=='consent')return new Response(null,{status:403,headers})
  sessions().delete(sessionKey(request));
  return Response.json({enabled:false,documents:[]},{headers:{...headers,'Set-Cookie':`${cookie}=; Path=/homologacao; HttpOnly; SameSite=Strict; Max-Age=0`}})
 }
 return new Response(null,{status:405,headers})
}
function capabilities(){return originalDocuments.map(d=>({...d,url:'/homologacao/documentos/'+d.slug,downloadUrl:'/homologacao/documentos/'+d.slug+'?download=1'}))}
export async function verifiedBytes(slug:string){
 const d=originalDocuments.find(d=>d.slug===slug);if(!d)throw new Error('DOCUMENT_UNKNOWN')
 const root=process.env.PAP_PRIVATE_REVIEW_ROOT;if(!root)throw new Error('PRIVATE_ROOT_REQUIRED')
 const bytes=await readFile(join(root,'docs/protocolos/documentos-originais',d.filename))
 if(bytes.length!==d.bytes||bytes.subarray(0,5).toString()!=='%PDF-'||createHash('sha256').update(bytes).digest('hex')!==d.sha256)throw new Error('DOCUMENT_INTEGRITY_FAILED')
 return {bytes,document:d}
}
export async function documentResponse(request:Request,slug:string){
 if(!authorized(request))return Response.json({error:'LOCAL_DOCUMENT_ACCESS_DENIED'},{status:403,headers})
 if(request.method!=='GET')return new Response(null,{status:405,headers})
 const query=new URL(request.url).searchParams
 if([...query.keys()].some(k=>k!=='download')||query.getAll('download').length>1||(query.has('download')&&query.get('download')!=='1'))return new Response(null,{status:404,headers})
 if(!originalDocuments.some(d=>d.slug===slug))return new Response(null,{status:404,headers})
 try{const {bytes,document}=await verifiedBytes(slug);return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`${query.has('download')?'attachment':'inline'}; filename="${document.filename}"`,'Content-Length':String(bytes.length),'Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'self'"}})}catch{return Response.json({error:'DOCUMENT_UNAVAILABLE_OR_INTEGRITY_FAILED'},{status:503,headers})}
}
