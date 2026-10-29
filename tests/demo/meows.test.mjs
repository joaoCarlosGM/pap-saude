import './load.mjs'
import {createRequire} from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
const load=createRequire(import.meta.url),{calculateDemoMeows:calculate}=load('../../src/lib/demo/meows.ts')
const normal=()=>({paSistolica:'120',paDiastolica:'70',frequenciaCardiaca:'80',frequenciaRespiratoria:'14',temperatura:'37.0',oxygenMode:'air',oxygenFlow:'',nivelConsciencia:'alerta',saturacaoO2:''})
const boundaries={
 PAS:{field:'paSistolica',pairs:[[79,3],[80,2],[89,2],[90,0],[139,0],[140,1],[149,1],[150,2],[159,2],[160,3]]},
 PAD:{field:'paDiastolica',pairs:[[39,3],[40,2],[49,2],[50,0],[89,0],[90,1],[99,1],[100,2],[109,2],[110,3]]},
 FC:{field:'frequenciaCardiaca',pairs:[[59,3],[60,0],[100,0],[101,1],[110,1],[111,2],[149,2],[150,3]]},
 FR:{field:'frequenciaRespiratoria',pairs:[[11,3],[12,0],[17,0],[18,1],[24,1],[25,2],[29,2],[30,3]]},
 TEMPERATURA:{field:'temperatura',pairs:[['35.0',3],['35.1',0],['37.4',0],['37.5',1],['38.9',1],['39.0',3]]},
}
for(const [key,rule]of Object.entries(boundaries))for(const [value,points]of rule.pairs)test(`MEOWS ${key} ${value} => ${points}`,()=>{
 const d={...normal(),[rule.field]:String(value)};if(key==='PAD')d.paSistolica='180'
 const result=calculate(d);assert.equal(result.status,'CALCULADO');assert.equal(result.parameters.find(p=>p.key===key).points,points)
})
for(const [mode,flow,points]of [['air','',0],['supplemental','0',2],['supplemental','4.9',2],['supplemental','4.999999999999',2],['supplemental','5',3]])test(`MEOWS oxygen ${mode}/${flow} => ${points}`,()=>{assert.equal(calculate({...normal(),oxygenMode:mode,oxygenFlow:flow}).parameters.find(p=>p.key==='OXIGENIO').points,points)})
for(const [value,points]of [['alerta',0],['confusa',3],['sonolenta',3],['inconsciente',3]])test(`MEOWS consciousness ${value}`,()=>{const r=calculate({...normal(),nivelConsciencia:value});assert.equal(r.parameters.find(p=>p.key==='CONSCIENCIA').points,points);assert.equal(r.parameters.at(-1).value,value[0].toUpperCase()+value.slice(1))})
test('MEOWS class precedence and critical trigger are independent',()=>{
 for(const [patch,score,classification,critical]of [
  [{},0,'SEM_ALERTA_PELO_SCORE',false],
  [{paSistolica:'140'},1,'ALERTA_REAVALIACAO',false],
  [{paSistolica:'150',paDiastolica:'90'},3,'ALERTA_REAVALIACAO',false],
  [{paSistolica:'150',paDiastolica:'100'},4,'MODERADO',false],
  [{paSistolica:'150',paDiastolica:'100',frequenciaCardiaca:'101'},5,'MODERADO',false],
  [{paSistolica:'150',paDiastolica:'100',frequenciaCardiaca:'111'},6,'ALTO_RISCO_PELO_SCORE',false],
  [{paSistolica:'160'},3,'ALERTA_CRITICO',true],
  [{paSistolica:'160',paDiastolica:'90'},4,'ALERTA_CRITICO',true],
  [{paSistolica:'160',paDiastolica:'110',frequenciaCardiaca:'150',frequenciaRespiratoria:'30',temperatura:'39.0',oxygenMode:'supplemental',oxygenFlow:'5',nivelConsciencia:'inconsciente'},21,'ALTO_RISCO_PELO_SCORE',true],
 ]){const r=calculate({...normal(),...patch});assert.equal(r.score,score);assert.equal(r.classification,classification);assert.equal(r.critical,critical);assert.equal(r.protocolVersion,'PAP-MEOWS v1.0')}
})
test('MEOWS missing fields never become normal, including missing oxygen flow',()=>{
 for(const field of ['paSistolica','paDiastolica','frequenciaCardiaca','frequenciaRespiratoria','temperatura','nivelConsciencia','oxygenMode']){const r=calculate({...normal(),[field]:''});assert.equal(r.score,null);assert.equal(r.classification,'INCOMPLETO');assert.ok(r.missing.length)}
 const r=calculate({...normal(),oxygenMode:'supplemental',oxygenFlow:''});assert.equal(r.score,null);assert.equal(r.parameters.find(p=>p.key==='OXIGENIO').points,null)
 const critical=calculate({...normal(),paSistolica:'160',temperatura:''});assert.equal(critical.classification,'INCOMPLETO');assert.equal(critical.critical,true)
})
test('MEOWS invalid values and excess temperature precision are rejected, not rounded',()=>{
 for(const patch of [{temperatura:'37.45'},{temperatura:'35.05'},{temperatura:'NaN'},{paSistolica:'139.9'},{paSistolica:'0'},{paSistolica:'60',paDiastolica:'70'},{frequenciaCardiaca:'Infinity'},{oxygenMode:'supplemental',oxygenFlow:'-1'},{nivelConsciencia:'qualquer texto'}]){const r=calculate({...normal(),...patch});assert.equal(r.status,'INVALIDO');assert.equal(r.score,null);assert.ok(r.errors.length)}
 assert.equal(calculate({...normal(),temperatura:'37'}).score,0)
 assert.equal(calculate({...normal(),temperatura:'37,4'}).score,0)
})
test('MEOWS SpO2 is preserved by callers and never adds a scoring component',()=>{for(const saturation of ['', '70','100']){const r=calculate({...normal(),saturacaoO2:saturation});assert.equal(r.score,0);assert.equal(r.parameters.length,7);assert.ok(!r.parameters.some(p=>p.key==='SPO2'))}})
