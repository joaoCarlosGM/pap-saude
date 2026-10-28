import { NextRequest } from 'next/server';
import { POST as issue } from '../../src/app/api/auth/login/verification/route';
import { POST as login } from '../../src/app/api/auth/login/route';
/** Historical login tests exercise the real challenge protocol, not a bypass.
 * Malformed/untrusted requests stay untouched so their negative assertions hold. */
export async function POST(request: NextRequest) {
  let body;
  try { body=await request.clone().json(); } catch { return login(request); }
  if(typeof body?.email!=='string'||typeof body?.password!=='string')return login(request);
  const headers=new Headers(request.headers);headers.delete('content-length');
  const issued=await issue(new NextRequest(new URL('/api/auth/login/verification',request.url),{method:'POST',headers,body:JSON.stringify({accessible:true})}));
  if(!issued.ok)return login(request);
  const challenge=await issued.json(),numbers=String(challenge.question).match(/\d+/g)?.map(Number);
  if(numbers?.length!==2)throw Error('Expected the real accessible challenge');
  const binding=issued.cookies.get('pap_login_verification')!.value;
  headers.set('cookie',[request.headers.get('cookie'),`pap_login_verification=${binding}`].filter(Boolean).join('; '));
  return login(new NextRequest(request.url,{method:'POST',headers,body:JSON.stringify({...body,verificationId:challenge.id,verificationAnswer:String(numbers[0]*numbers[1])})}));
}
