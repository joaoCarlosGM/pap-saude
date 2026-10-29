import {test} from "node:test";
import assert from "node:assert/strict";
import {buildSync} from "esbuild";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createRequire} from "node:module";
import {clinicalErrorResponse} from "../../src/server/http/clinical-api-response";
test("minified encounter domain errors preserve their public names and HTTP denial contract",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"pap-unified-errors-"));
 try{
  for(const path of ["encounters/encounter.errors.ts","patients/patient.errors.ts","patients/patient-organization.errors.ts","pregnancies/pregnancy.errors.ts"]){
 const built=buildSync({entryPoints:["src/server/"+path],bundle:true,minify:true,platform:"node",format:"cjs",write:false}).outputFiles[0].text;
  const file=join(dir,path.replaceAll("/","-")+".cjs");writeFileSync(file,built);
  const exported=createRequire(import.meta.url)(file) as Record<string,new(message?:string)=>Error>;
  for(const [name,Constructor] of Object.entries(exported))assert.equal(new Constructor("Synthetic test").name,name);
  if(path.startsWith("encounters/"))for(const [name,status] of [["EncounterFinalizedError",400],["InvalidEncounterTransitionError",400],["EncounterNotFoundError",404]] as const){
   const response=clinicalErrorResponse(new exported[name]());assert.equal(response.status,status);assert.equal((await response.json()).error,name);
  }
 }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
