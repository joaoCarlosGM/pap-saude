import {registryResponse} from '@/../scripts/private-review/registry-api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return registryResponse(request,(await params).id,'documentos')}
export const POST=GET;
