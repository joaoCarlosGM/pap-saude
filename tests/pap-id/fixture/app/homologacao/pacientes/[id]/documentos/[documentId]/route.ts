import {registryResponse} from '@/../scripts/private-review/registry-api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string;documentId:string}>}){const {id,documentId}=await params;return registryResponse(request,id,'documentos',documentId)}
export const DELETE=GET;
