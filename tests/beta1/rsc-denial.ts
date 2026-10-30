import {expect,type APIResponse} from '@playwright/test';
/** A rendered guard can reject after Flight headers have streamed. An HTTP200
 * alone is never success: require the exact404 fallback digest and no data. */
export async function assertCourseRscDenied(response:APIResponse,privateValues:string[]){
 const body=await response.text();
 if(response.status()!==404){expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('text/x-component');expect(body.includes('NEXT_HTTP_ERROR_FALLBACK;404')).toBe(true);}
 for(const value of privateValues)if(value)expect(body.includes(value),'Foreign course data or private authentication material must never be streamed').toBe(false);
 expect(/"correctIndex"\s*:|"expected"\s*:|otpauth:\/\//.test(body)).toBe(false);
}
