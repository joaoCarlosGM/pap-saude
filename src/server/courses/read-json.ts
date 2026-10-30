import {CourseError} from './context';
const MAX_BYTES=32*1024;
/** Bound streamed bodies too; Content-Length is advisory and may be absent. */
export async function readCourseJson(request:Request):Promise<Record<string,unknown>>{
 const invalid=()=>new CourseError('COURSE_INVALID_PAYLOAD',400);
 if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type')||''))throw invalid();
 const size=request.headers.get('content-length');
 if(size!==null&&(!/^\d+$/.test(size)||Number(size)>MAX_BYTES))throw invalid();
 const reader=request.body?.getReader();if(!reader)throw invalid();
 const chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();throw invalid();}chunks.push(next.value);}}
 finally{reader.releaseLock();}
 const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
 try{const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();return value as Record<string,unknown>;}catch{throw invalid();}
}
