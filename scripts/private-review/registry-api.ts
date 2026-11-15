import {createHash} from 'node:crypto';
import {authorized,expectedReviewOrigin} from './documents';import {readProfile,connect} from './card-store'
import {loadCard,listDocuments,uploadDocument,loadDocument,archiveDocument} from './registry-store'
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin','X-Robots-Tag':'noindex, nofollow'}
const rates=new Map<string,{count:number;until:number}>()
const uuid=(s:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s)
const person=(s:string)=>/^[a-z0-9-]{1,64}$/.test(s)
async function bounded(request:Request,max:number){const reader=request.body?.getReader();if(!reader)throw Error('EMPTY_FILE');const chunks:Uint8Array[]=[];let size=0;for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max){await reader.cancel();throw Error('FILE_TOO_LARGE')}chunks.push(r.value)}return Buffer.concat(chunks)}
export async function registryResponse(request:Request,patientId:string,resource:'documentos'|'carteirinhas',id?:string){
 if(!authorized(request)||!process.env.PAP_ID_REVIEW_PROFILE)return Response.json({error:'LOCAL_REVIEW_REQUIRED'},{status:403,headers})
 const key=createHash('sha256').update(request.headers.get('cookie')||'').digest('hex'),now=Date.now(),rate=rates.get(key);if(rate&&rate.until>now&&rate.count>=120)return Response.json({error:'LOCAL_REVIEW_RATE_LIMIT'},{status:429,headers});if(!rate||rate.until<=now){for(const [k,r]of rates)if(r.until<=now)rates.delete(k);if(rates.size>=100)return new Response(null,{status:429,headers});rates.set(key,{count:1,until:now+60000})}else rate.count++
 if(!person(patientId)||(id&&!uuid(id)))return new Response(null,{status:404,headers})
 const query=new URL(request.url).searchParams;if([...query.keys()].some(k=>k!=='download')||query.getAll('download').length>1||(query.has('download')&&query.get('download')!=='1'))return new Response(null,{status:404,headers})
 if(!['GET','POST','DELETE'].includes(request.method))return new Response(null,{status:405,headers})
 if(request.method!=='GET'&&(request.headers.get('origin')!==expectedReviewOrigin(request)||request.headers.get('x-pap-local-review')!=='documents'))return new Response(null,{status:403,headers})
 let pool:ReturnType<typeof connect>|undefined
 try{const profile=await readProfile(process.env.PAP_ID_REVIEW_PROFILE);pool=connect(profile)
 if(resource==='carteirinhas'){if(!id||request.method!=='GET')return new Response(null,{status:405,headers});const bytes=await loadCard(pool,profile,patientId,id);if(!bytes)return new Response(null,{status:404,headers});return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'image/png','Content-Length':String(bytes.length),'Content-Disposition':`${query.has('download')?'attachment':'inline'}; filename="carteirinha-teste.png"`}})}
 if(request.method==='GET'){
  if(!id)return Response.json({documents:await listDocuments(pool,patientId)},{headers})
  const doc=await loadDocument(pool,patientId,id);if(!doc)return new Response(null,{status:404,headers})
  return new Response(new Uint8Array(doc.bytes),{headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(doc.bytes.length),'Content-Disposition':`${query.has('download')?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,'Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'self'"}})
 }
 if(request.method==='DELETE'){if(!id)return new Response(null,{status:404,headers});return Response.json({archived:await archiveDocument(pool,patientId,id)},{headers})}
 if(id||request.headers.get('content-type')!=='application/pdf'||request.headers.get('x-pap-synthetic-document')!=='confirmed')return Response.json({error:'SYNTHETIC_PDF_REQUIRED'},{status:400,headers})
 const name=decodeURIComponent(request.headers.get('x-pap-document-name')||''),category=request.headers.get('x-pap-document-category')||'',operationId=request.headers.get('x-pap-operation')||'',groupId=request.headers.get('x-pap-document-version')||undefined
 const doc=await uploadDocument(pool,patientId,{name,category,operationId,groupId},await bounded(request,5242880));return Response.json({document:doc},{status:201,headers})
 }catch(error){const message=error instanceof Error?error.message:'';const diagnostic=/fake worker|workerSrc|pdf\.worker/i.test(message)?'PDF_WORKER_UNAVAILABLE':/DOMMatrix|DOMException|canvas|Path2D/i.test(message)?'PDF_RUNTIME_UNAVAILABLE':/INVALID_PDF|InvalidPDF|UNSAFE_PDF|Invalid PDF/i.test(message)?'PDF_INVALID_OR_UNSAFE':/metadata/i.test(message)?'METADATA_REJECTED':'OPERATION_REJECTED';console.error('PRIVATE_DOCUMENT_FAILURE',diagnostic);return Response.json({error:'PRIVATE_DOCUMENT_OPERATION_DENIED',diagnostic},{status:diagnostic.includes('UNAVAILABLE')?503:400,headers})}finally{await pool?.end()}
}
