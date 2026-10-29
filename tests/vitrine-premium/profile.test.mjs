import './load.mjs'
import {createRequire} from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const load=createRequire(import.meta.url)
const {initialDemo,saveDemo}=load('../../src/features/vitrine-premium/lib/demo/data.ts')
const {editDemoProfile,DEFAULT_DEMO_PROFILE}=load('../../src/features/vitrine-premium/lib/demo/profile.ts')
test('institutional metadata has a single synthetic source and reset restores independent defaults',()=>{
 const a=initialDemo(),b=initialDemo();assert.deepEqual(a.profile,DEFAULT_DEMO_PROFILE)
 a.profile=editDemoProfile(a.profile,{name:'Nome Demonstrativo',municipality:'Cidade Fictícia',uf:'ce',unit:'UBS Exemplo'})
 assert.equal(a.profile.initials,'ND');assert.equal(a.profile.uf,'CE');assert.equal(b.profile.name,'Ana Paula')
 const d={cpf:'32165498701',nomeCompleto:'Pessoa Sintética',dataNascimento:'1995-03-05',dumUnknown:true,dum:'',paSistolica:'',paDiastolica:'',frequenciaCardiaca:'',frequenciaRespiratoria:'',temperatura:'',saturacaoO2:'',observacoesProfissional:''}
 assert.deepEqual(saveDemo(a,d).profile,a.profile)
 assert.deepEqual(initialDemo().profile,DEFAULT_DEMO_PROFILE)
 assert.equal(initialDemo().patients.length,3)
})
