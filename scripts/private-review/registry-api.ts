import {ZodError} from 'zod'
import {ChartError,readChart,readChartActivity,writeChart} from './longitudinal-store'
import {cardPdf,detailedCard,monochromeCard} from './card-image'
import {createHash} from 'node:crypto';
import {authorized,expectedReviewOrigin} from './documents';import {readProfile,connect} from './card-store'
import {loadCard,listDocuments,uploadDocument,loadDocument,archiveDocument} from './registry-store'
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin','X-Robots-Tag':'noindex, nofollow'}
const rates=new Map<string,{count:number;until:number}>()
const uuid=(s:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s)
const person=(s:string)=>/^[a-z0-9-]{1,64}$/.test(s)
async function bounded(request:Request,max:number){const reader=request.body?.getReader();if(!reader)throw Error('EMPTY_FILE');const chunks:Uint8Array[]=[];let size=0;for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max){await reader.cancel();throw Error('FILE_TOO_LARGE')}chunks.push(r.value)}return Buffer.concat(chunks)}
export async function registryResponse(request:Request,patientId:string,resource:'documentos'|'carteirinhas'|'prontuario'|'atividade',id?:string){
 if(!authorized(request)||!process.env.PAP_ID_REVIEW_PROFILE)return Response.json({error:'LOCAL_REVIEW_REQUIRED'},{status:403,headers})
 const key=createHash('sha256').update(request.headers.get('cookie')||'').digest('hex'),now=Date.now(),rate=rates.get(key);if(rate&&rate.until>now&&rate.count>=120)return Response.json({error:'LOCAL_REVIEW_RATE_LIMIT'},{status:429,headers});if(!rate||rate.until<=now){for(const [k,r]of rates)if(r.until<=now)rates.delete(k);if(rates.size>=100)return new Response(null,{status:429,headers});rates.set(key,{count:1,until:now+60000})}else rate.count++
 if(!person(patientId)||(id&&!uuid(id)))return new Response(null,{status:404,headers})
 const chartResource=resource==='prontuario'||resource==='atividade'
 const query=new URL(request.url).searchParams
 const options=resource==='carteirinhas'?{download:'1',format:'pdf',tone:'mono',detail:'1'}:chartResource?{}:{download:'1'}
 if([...query.keys()].some(k=>!(k in options)||query.getAll(k).length!==1||query.get(k)!==options[k as keyof typeof options]))return new Response(null,{status:404,headers})
 if(!(resource==='atividade'?['GET']:resource==='prontuario'?['GET','POST']:['GET','POST','DELETE']).includes(request.method))return new Response(null,{status:405,headers})
 if(request.method!=='GET'&&(request.headers.get('origin')!==expectedReviewOrigin(request)||request.headers.get('x-pap-local-review')!==(resource==='prontuario'?'chart':'documents')))return new Response(null,{status:403,headers})
 let pool:ReturnType<typeof connect>|undefined
 try{const profile=await readProfile(process.env.PAP_ID_REVIEW_PROFILE);pool=connect(profile)
 if(chartResource){
  if(id)return new Response(null,{status:404,headers})
  const meta=(await pool.query('SELECT owner,schema_version,current_database() AS name FROM review_meta')).rows[0]
  if(meta?.owner!==profile.owner||meta.name!==profile.database||meta.schema_version<3)throw new ChartError(503,'CHART_UNAVAILABLE')
  if(resource==='atividade')return Response.json({events:await readChartActivity(pool)},{headers})
  if(request.method==='GET')return Response.json(await readChart(pool,patientId),{headers})
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return new Response(null,{status:415,headers})
  let input:unknown
  try{input=JSON.parse((await bounded(request,65536)).toString('utf8'))}catch{return Response.json({error:'INVALID_CHART_INPUT'},{status:400,headers})}
  return Response.json({event:await writeChart(pool,patientId,input)},{headers})
 }
 if(resource==='carteirinhas'){
  if(!id||request.method!=='GET')return new Response(null,{status:405,headers})
  const stored=await loadCard(pool,profile,patientId,id,{activeOnly:true})
  if(!stored)return new Response(null,{status:404,headers})
  const rendered=query.has('detail')?await detailedCard(stored,patientId):stored
  const image=query.has('tone')?await monochromeCard(rendered):rendered
  const pdf=query.has('format'),bytes=pdf?await cardPdf(image):image
  return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':pdf?'application/pdf':'image/png','Content-Length':String(bytes.length),'Content-Disposition':`${query.has('download')?'attachment':'inline'}; filename="carteirinha-pap-id.${pdf?'pdf':'png'}"`}})
 }
 if(request.method==='GET'){
  if(!id)return Response.json({documents:await listDocuments(pool,patientId)},{headers})
  const doc=await loadDocument(pool,patientId,id);if(!doc)return new Response(null,{status:404,headers})
  return new Response(new Uint8Array(doc.bytes),{headers:{...headers,'Content-Type':'application/pdf','Content-Length':String(doc.bytes.length),'Content-Disposition':`${query.has('download')?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,'Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'self'"}})
 }
 if(request.method==='DELETE'){if(!id)return new Response(null,{status:404,headers});return Response.json({archived:await archiveDocument(pool,patientId,id)},{headers})}
 if(id||request.headers.get('content-type')!=='application/pdf'||request.headers.get('x-pap-synthetic-document')!=='confirmed')return Response.json({error:'SYNTHETIC_PDF_REQUIRED'},{status:400,headers})
 const name=decodeURIComponent(request.headers.get('x-pap-document-name')||''),category=request.headers.get('x-pap-document-category')||'',operationId=request.headers.get('x-pap-operation')||'',groupId=request.headers.get('x-pap-document-version')||undefined
 const doc=await uploadDocument(pool,patientId,{name,category,operationId,groupId},await bounded(request,5242880));return Response.json({document:doc},{status:201,headers})
 }catch(error){
 if(chartResource){
  if(error instanceof ChartError)return Response.json({error:error.code},{status:error.status,headers})
  if(error instanceof ZodError)return Response.json({error:'INVALID_CHART_INPUT'},{status:400,headers})
  console.error('PRIVATE_CHART_UNAVAILABLE')
  return Response.json({error:'CHART_UNAVAILABLE'},{status:503,headers})
 }
 const message=error instanceof Error?error.message:'';const diagnostic=/fake worker|workerSrc|pdf\.worker/i.test(message)?'PDF_WORKER_UNAVAILABLE':/DOMMatrix|DOMException|canvas|Path2D/i.test(message)?'PDF_RUNTIME_UNAVAILABLE':/INVALID_PDF|InvalidPDF|UNSAFE_PDF|Invalid PDF/i.test(message)?'PDF_INVALID_OR_UNSAFE':/metadata/i.test(message)?'METADATA_REJECTED':'OPERATION_REJECTED';console.error('PRIVATE_DOCUMENT_FAILURE',diagnostic);return Response.json({error:'PRIVATE_DOCUMENT_OPERATION_DENIED',diagnostic},{status:diagnostic.includes('UNAVAILABLE')?503:400,headers})}finally{await pool?.end()}
}
