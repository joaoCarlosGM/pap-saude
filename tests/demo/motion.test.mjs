import './load.mjs'
import {createRequire} from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const load=createRequire(import.meta.url),{parseMetric,formatMetric}=load('../../src/lib/demo/motion.ts')
test('metric presentation never converts missing or unsupported formats to zero',()=>{for(const v of ['—','Indisponível','NaN','Infinity','-2','1.234'])assert.equal(parseMetric(v),null);assert.equal(parseMetric('0').target,0)})
test('count formatting preserves units/precision and never overshoots true data',()=>{const p=parseMetric('12,5%');assert.equal(formatMetric(6.25,p),'6,3%');assert.equal(formatMetric(20,p),'12,5%');assert.equal(formatMetric(-1,p),'0,0%');assert.equal(formatMetric(24,parseMetric('24 min')),'24 min')})
