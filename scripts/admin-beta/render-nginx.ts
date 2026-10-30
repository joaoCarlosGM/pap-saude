import {ADMIN_BETA_PAGES,ADMIN_BETA_API} from '../../src/lib/admin-beta-policy';
import {writeFileSync} from 'node:fs';
export function nginxRouteMap(){
 const lines=['# Generated from src/lib/admin-beta-policy.ts. Default denial is intentional.','map "$request_method:$uri" $pap_admin_beta_allowed {','    default 0;'];
 for(const path of ADMIN_BETA_PAGES)for(const method of ['GET','HEAD'])lines.push(`    "${method}:${path}" 1;`);
 for(const [path,methods]of Object.entries(ADMIN_BETA_API))if(path!=='/api/health')for(const method of methods)lines.push(`    "${method}:${path}" 1;`);
 lines.push('    "POST:/api/email/resend/webhook" 1; # application still requires explicit email approval + signature');
 const uuid='[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
 for(const [methods,path]of [['GET|HEAD',`/admin/rede/${uuid}`],['PATCH',`/api/admin/organizations/${uuid}`],['DELETE',`/api/admin/role-assignments/${uuid}`],['GET|PATCH','/api/onboarding/admin-core']])lines.push(`    "~^(?:${methods}):${path}$" 1;`);
 lines.push('    "~^(?:GET|HEAD):/_next/static/[a-zA-Z0-9_/@.()\\[\\]-]+\\.(?:js|css|woff2?|ttf|png|jpe?g|webp|avif|svg|ico)$" 1;','    "~^(?:GET|HEAD):/(?:brand|fonts|images|illustrations|assets|beta1|banners)/[a-zA-Z0-9_/().-]+\\.(?:woff2?|ttf|png|jpe?g|webp|avif|svg|ico)$" 1;','    "~^(?:GET|HEAD):/(?:favicon.ico|icon.png|apple-icon.png)$" 1;','}');return lines.join('\n')+'\n';
}
if(process.argv[1]?.endsWith('render-nginx.ts'))writeFileSync('deploy/admin-beta/routes.map.conf',nginxRouteMap());
