import './load.mjs'
import {createRequire} from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const load=createRequire(import.meta.url),{authorizedTourSteps,placeTour,DEMO_TOUR_STEPS}=load('../../src/lib/demo/tour.ts')
test('reusable tour requires authorized host routes/capabilities and a complete security context',()=>{
 const steps=[{...DEMO_TOUR_STEPS[0],requiredCapabilities:['dashboard.read']},{...DEMO_TOUR_STEPS[1],path:'//foreign.invalid'}]
 assert.deepEqual(authorizedTourSteps(steps,{securityReady:false,routes:new Set(['/dashboard']),capabilities:new Set(['dashboard.read'])}),[])
 assert.deepEqual(authorizedTourSteps(steps,{securityReady:true,routes:new Set(['/dashboard']),capabilities:new Set()}),[])
 assert.deepEqual(authorizedTourSteps(steps,{securityReady:true,routes:new Set(),capabilities:new Set(['dashboard.read'])}),[])
 assert.equal(authorizedTourSteps(steps,{securityReady:true,routes:new Set(['/dashboard','//foreign.invalid']),capabilities:new Set(['dashboard.read'])}).length,1)
})
test('six real-route demo anchors and tooltip positions fit mobile/desktop without covering target',()=>{
 assert.equal(DEMO_TOUR_STEPS.length,6);assert.equal(new Set(DEMO_TOUR_STEPS.map(s=>s.id)).size,6)
 for(const width of [320,375,390,430,768,1440]){const r={left:12,top:12,width:width-24,height:170},p=placeTour(r,{width,height:844});assert.ok(p.left>=0&&p.left+p.width<=width);assert.ok(p.top>=r.top+r.height);assert.ok(p.top+p.maxHeight<=844)}
})
