import './load.mjs'
import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const load=createRequire(import.meta.url)
const Medications=load('../../src/features/vitrine-premium/components/pacientes/PatientMedications.tsx').default
const Input=load('../../src/features/vitrine-premium/components/ui/Input.tsx').default
test('synthetic form labels bind unique generated IDs and preserve explicit registration selectors',()=>{
 const html=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(Input,{label:'Nome'}),React.createElement(Input,{label:'E-mail'})))
 const labels=[...html.matchAll(/<label[^>]*for="([^"]+)"/g)].map(m=>m[1]),ids=[...html.matchAll(/<input[^>]*id="([^"]+)"/g)].map(m=>m[1])
 assert.equal(labels.length,2);assert.equal(new Set(labels).size,2);assert.deepEqual(labels,ids)
 const explicit=renderToStaticMarkup(React.createElement(Input,{id:'patient-name',label:'Nome'}));assert.match(explicit,/for="patient-name"/);assert.match(explicit,/id="patient-name"/)
})
test('empty medication table remains valid HTML and absence never invents a dose',()=>{
 const empty=renderToStaticMarkup(React.createElement(Medications,{patient:{medications:[]}}))
 assert.match(empty,/<tbody[^>]*><tr><td[^>]*colSpan="4"/i)
 assert.match(empty,/Sem informação registrada/)
 assert.doesNotMatch(empty,/<tbody[^>]*>\s*<p/i)
 const row=renderToStaticMarkup(React.createElement(Medications,{patient:{medications:[{id:'demo-only',name:'Exemplo fictício',dose:'',frequency:'',route:''}]}}))
 assert.equal((row.match(/Não informado/g)||[]).length,3)
})
