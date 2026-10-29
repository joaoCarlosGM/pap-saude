import './load.mjs'
import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const load=createRequire(import.meta.url)
const Medications=load('../../src/features/vitrine-premium/components/pacientes/PatientMedications.tsx').default
test('empty medication table remains valid HTML and absence never invents a dose',()=>{
 const empty=renderToStaticMarkup(React.createElement(Medications,{patient:{medications:[]}}))
 assert.match(empty,/<tbody[^>]*><tr><td[^>]*colSpan="4"/i)
 assert.match(empty,/Sem informação registrada/)
 assert.doesNotMatch(empty,/<tbody[^>]*>\s*<p/i)
 const row=renderToStaticMarkup(React.createElement(Medications,{patient:{medications:[{id:'demo-only',name:'Exemplo fictício',dose:'',frequency:'',route:''}]}}))
 assert.equal((row.match(/Não informado/g)||[]).length,3)
})
