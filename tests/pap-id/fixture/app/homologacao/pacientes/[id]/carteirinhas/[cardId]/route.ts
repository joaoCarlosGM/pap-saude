import {registryResponse} from '@/../scripts/private-review/registry-api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string;cardId:string}>}){const {id,cardId}=await params;return registryResponse(request,id,'carteirinhas',cardId)}
