import assert from 'node:assert/strict';
import {isDynamicRouteMetadata} from '../mission04-e/rsc-dynamic-metadata';
/** Closed Next16.4 production metadata contract; never accept rendered data as prefetch.
 * `i` is route interceptability, not session authorization. Next dev forces true;
 * these production routes have no interception rewrites and must emit false.
 * Keep a single exact expected value, not a boolean/type-only acceptance.
 */
export function assertPublicRscMetadata(body:string,path:string){
 const rows=new Map<string,unknown>();for(const line of body.trim().split('\n')){const m=/^([0-9a-f]+):(.+)$/.exec(line);assert.ok(m);assert.ok(!rows.has(m[1]));rows.set(m[1],JSON.parse(m[2]));}
 const root=rows.get('0') as Record<string,unknown>;assert.ok(root);assert.deepEqual(Object.keys(root).sort(),['S','b','i','q','r','t'].sort());assert.equal(root.i,false);assert.equal(root.S,false);assert.equal(root.q,'');assert.equal(root.r,'$undefined');assert.equal(typeof root.b,'string');
 const tree=root.t as {t:Record<string,unknown>;h:unknown};assert.deepEqual(Object.keys(tree).sort(),['h','t']);assert.deepEqual(tree.h,{r:[null,null],p:true,v:null});
 const segments=new Set(['','__PAGE__','(dashboard)','(admin)','(auth)','(showcase)','(courses)',...path.split('/').filter(Boolean)]),seen=new Set<string>();
 function node(value:Record<string,unknown>){assert.ok(Object.keys(value).every(k=>['s','c','h'].includes(k)));if(value.s&&typeof value.s==='object'){const s=value.s as Record<string,unknown>;if(s.n==='id'&&['pacientes','aprender'].includes(path.split('/')[2])){assert.deepEqual(Object.keys(s).sort(),['k','n','s','t']);assert.equal(s.k,path.split('/')[3]);assert.equal(s.t,'d');assert.ok(s.s===null||(Array.isArray(s.s)&&s.s.length===0));}else assert.ok(isDynamicRouteMetadata(s,path.split('/')[2]));}else assert.ok(segments.has(value.s as string));if(value.h!==undefined)assert.equal(typeof value.h,'number');if(value.c!==undefined){assert.equal(typeof value.c,'string');const ref=/^\$Q([0-9a-f]+)$/.exec(value.c as string);assert.ok(ref);assert.ok(!seen.has(ref[1]));seen.add(ref[1]);const children=rows.get(ref[1]);assert.ok(Array.isArray(children));for(const child of children){assert.equal(child.length,2);assert.equal(child[0],'children');node(child[1]);}}}
 node(tree.t);assert.equal(rows.size,seen.size+1);
}
