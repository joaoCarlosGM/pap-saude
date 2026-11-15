import {documentResponse} from '@/../scripts/private-review/documents';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return documentResponse(request,(await params).slug)}
export const HEAD=()=>new Response(null,{status:405});
export const POST=HEAD;export const PUT=HEAD;export const PATCH=HEAD;export const DELETE=HEAD;
