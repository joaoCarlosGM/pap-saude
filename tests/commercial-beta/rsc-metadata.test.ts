import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicRscMetadata} from './rsc-metadata';
function metadata(){return {S:false,b:'public-build',i:false,q:'',r:'$undefined',t:{t:{s:'(showcase)'},h:{r:[null,null],p:true,v:null}}};}
test('RSC prefetch accepts only the closed public transport metadata, never extra user records',()=>{
 const good=metadata();assertPublicRscMetadata('0:'+JSON.stringify(good),'/vitrine/registro');
 for(const changed of [{...good,user:{name:'PRIVATE'}},{...good,i:true},{...good,t:{...good.t,t:{s:'PRIVATE_PATIENT'}}}])assert.throws(()=>assertPublicRscMetadata('0:'+JSON.stringify(changed),'/vitrine/registro'));
 assert.throws(()=>assertPublicRscMetadata('0:'+JSON.stringify(good)+'\n1:{"patient":"PRIVATE"}','/vitrine/registro'));
});
test('RSC dynamic segment siblings and route identifiers cannot smuggle private fields',()=>{
 const base=metadata();const value={n:'section',t:'d',k:'registro',s:['pacientes','aprender']};const payload=(segment:unknown)=>'0:'+JSON.stringify({...base,t:{...base.t,t:{s:segment}}});
 assertPublicRscMetadata(payload(value),'/vitrine/registro');
 for(const segment of [{...value,patient:'PRIVATE'},{...value,k:'dashboard'},{...value,s:['clinical']},{...value,s:['pacientes','pacientes']}])assert.throws(()=>assertPublicRscMetadata(payload(segment),'/vitrine/registro'));
});

test('production interceptability is exactly false; dev flags, missing values and coercions are rejected',()=>{
 const good=metadata();assertPublicRscMetadata('0:'+JSON.stringify(good),'/comercial');
 for(const i of [true,undefined,null,'false',0,1])assert.throws(()=>assertPublicRscMetadata('0:'+JSON.stringify({...good,i}),'/comercial'));
});
