import {verifiedSessionToken} from './verified-admin-session';
import {validateSession} from '../../src/server/auth/session.service';
/** Positive operational fixtures enroll and verify MFA through real services.
 * Never set mfaVerifiedAt directly; negative primary-session fixtures stay separate. */
export async function createVerifiedSession(input:{userId:string;userAgent?:string}){
 const token=await verifiedSessionToken(input.userId);const validated=await validateSession(token,{updateLastSeen:false});
 return {token,session:validated.session};
}
