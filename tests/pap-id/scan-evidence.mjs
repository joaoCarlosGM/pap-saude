// Review only the explicitly selected PNG evidence; never print decoded QR payloads.
import {readFile,readdir,writeFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {PNG} from 'pngjs';import jsQR from 'jsqr';
const dir=process.argv[2];assert.ok(dir,'evidence directory required');const result=[];
for(const name of (await readdir(dir)).filter(n=>n.endsWith('.png')).sort()){
 const bytes=await readFile(path.join(dir,name)),png=PNG.sync.read(bytes);assert.ok(png.width<=5000&&png.height<=15000,'bounded evidence');const qr=jsQR(new Uint8ClampedArray(png.data),png.width,png.height,{inversionAttempts:'attemptBoth'});assert.equal(qr,null,'QR payload in selected image: '+name);result.push({file:name,width:png.width,height:png.height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),decodedQr:false})
}
await writeFile(path.join(dir,'screenshots-manifest.json'),JSON.stringify({status:'PASS',images:result.length,qrPayloads:0,files:result},null,2)+'\n');console.log(JSON.stringify({status:'PASS',images:result.length,qrPayloads:0}));
