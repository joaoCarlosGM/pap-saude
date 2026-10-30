import React from 'react';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {patientAge} from '../../src/lib/patient-age';
import PatientCollection from '../../src/components/workspace/PatientCollection';
test('calendar age uses UTC birthday and preserves unknown/future data as absent',()=>{
 assert.equal(patientAge('1990-10-30T00:00:00Z',new Date('2026-10-29T23:59:59Z')),35);assert.equal(patientAge('1990-10-30',new Date('2026-10-30T00:00:00Z')),36);assert.equal(patientAge('not-a-date'),null);assert.equal(patientAge('2990-01-01'),null);
});
test('patient surface is a single native link, escapes identity, never fabricates clinical measures',()=>{
 const h=renderToStaticMarkup(<PatientCollection items={[{id:'p',name:'<img onerror=x>',description:'Nascimento autorizado',href:'/pacientes/p'}]}/>);
 assert.equal((h.match(/<a\b/g)||[]).length,1);assert.doesNotMatch(h,/<button|<img|MEOWS|IG:|DPP:/);assert.match(h,/&lt;img/);assert.match(h,/Ver prontuário/);
});
