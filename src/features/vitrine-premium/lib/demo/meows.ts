import type {MeowsResult,MeowsParameter,MeowsParameterKey} from '../../types/meows'
export type DemoMeowsInput = {
  paSistolica?:string; paDiastolica?:string; frequenciaCardiaca?:string
  frequenciaRespiratoria?:string; temperatura?:string; nivelConsciencia?:string
  oxygenMode?:'air'|'supplemental'|'unknown'; oxygenFlow?:string; saturacaoO2?:string
}
// Operator-supplied PAP-MEOWS v1.0 matrix. Demonstration only, never a clinical diagnosis.
// No rounding at a classification boundary. No side effects, treatment or automatic referral.
export function calculateDemoMeows(input:DemoMeowsInput):MeowsResult {
  const missing:MeowsParameterKey[]=[],errors:MeowsResult['errors']=[],parameters:MeowsParameter[]=[]
  function absent(raw:unknown){return raw===undefined||raw===null||(typeof raw==='string'&&raw.trim()==='')}
  function invalid(key:MeowsParameterKey,message:string){errors.push({parameter:key,message});return null}
  function integer(key:MeowsParameterKey,raw:unknown,min:number,max:number) {
    if(absent(raw)){missing.push(key);return null}
    if(typeof raw!=='string'||!/^\d{1,3}$/.test(raw.trim()))return invalid(key,'Informe um número inteiro, sem arredondamento.')
    const value=Number(raw.trim())
    return value>=min&&value<=max?value:invalid(key,`Valor fora dos limites de entrada demonstrativa (${min}–${max}).`)
  }
  const pas=integer('PAS',input.paSistolica,1,350),pad=integer('PAD',input.paDiastolica,1,250)
  const fc=integer('FC',input.frequenciaCardiaca,1,300),fr=integer('FR',input.frequenciaRespiratoria,1,100)
  let temperature:number|null=null
  if(absent(input.temperatura))missing.push('TEMPERATURA')
  else if(typeof input.temperatura!=='string'||!/^\d{2}(?:[.,]\d)?$/.test(input.temperatura.trim()))invalid('TEMPERATURA','Temperatura aceita no máximo uma casa decimal; duas casas não são arredondadas.')
  else {
    const [whole,fraction='0']=input.temperatura.trim().replace(',','.').split('.')
    const tenths=Number(whole)*10+Number(fraction)
    if(tenths<250||tenths>450)invalid('TEMPERATURA','Temperatura fora dos limites de entrada demonstrativa (25,0–45,0 °C).')
    else temperature=tenths
  }
  let oxygen:number|null=null,oxygenValue='Não aferido'
  if(!input.oxygenMode||input.oxygenMode==='unknown')missing.push('OXIGENIO')
  else if(input.oxygenMode==='air'){oxygen=0;oxygenValue='Ar ambiente'}
  else if(input.oxygenMode==='supplemental'){
    if(absent(input.oxygenFlow))missing.push('OXIGENIO')
    else if(typeof input.oxygenFlow!=='string'||!/^\d{1,6}(?:[.,]\d{1,12})?$/.test(input.oxygenFlow.trim()))invalid('OXIGENIO','Informe fluxo não negativo e finito em L/min.')
    else {
      // Compare the integer part to 5, avoiding binary rounding of e.g. 4.999999999999.
      oxygen=Number(input.oxygenFlow.trim().split(/[.,]/)[0])<5?2:3
      oxygenValue=`O₂ suplementar ${input.oxygenFlow.trim()} L/min`
    }
  } else invalid('OXIGENIO','Modo de oxigênio inválido.')
  const descriptions:Record<string,string>={alerta:'Alerta',confusa:'Confusa',sonolenta:'Sonolenta',inconsciente:'Inconsciente'}
  let consciousness:number|null=null
  if(absent(input.nivelConsciencia)||input.nivelConsciencia==='desconhecido')missing.push('CONSCIENCIA')
  else if(!Object.hasOwn(descriptions,input.nivelConsciencia!))invalid('CONSCIENCIA','Selecione um estado de consciência reconhecido.')
  else consciousness=input.nivelConsciencia==='alerta'?0:3
  if(pas!==null&&pad!==null&&pas<=pad)invalid('PAS','Pressão sistólica deve ser maior que a diastólica.')
  const display=(raw:unknown,unit:string)=>typeof raw==='string'&&raw.trim()?`${raw.trim()} ${unit}`:'Não aferido'
  parameters.push(
    {key:'PAS',parameter:'PAS',value:display(input.paSistolica,'mmHg'),points:pas===null?null:pas<80?3:pas<90?2:pas<140?0:pas<150?1:pas<160?2:3},
    {key:'PAD',parameter:'PAD',value:display(input.paDiastolica,'mmHg'),points:pad===null?null:pad<=39?3:pad<50?2:pad<90?0:pad<100?1:pad<110?2:3},
    {key:'FC',parameter:'Frequência cardíaca',value:display(input.frequenciaCardiaca,'bpm'),points:fc===null?null:fc<60?3:fc<=100?0:fc<=110?1:fc<150?2:3},
    {key:'FR',parameter:'Frequência respiratória',value:display(input.frequenciaRespiratoria,'irpm'),points:fr===null?null:fr<12?3:fr<=17?0:fr<=24?1:fr<30?2:3},
    {key:'TEMPERATURA',parameter:'Temperatura',value:temperature===null?display(input.temperatura,'°C'):`${Math.floor(temperature/10)},${temperature%10} °C`,points:temperature===null?null:temperature<=350?3:temperature<=374?0:temperature<=389?1:3},
    {key:'OXIGENIO',parameter:'Oxigênio suplementar',value:oxygenValue,points:oxygen},
    {key:'CONSCIENCIA',parameter:'Consciência',value:descriptions[input.nivelConsciencia||'']||'Não aferida',points:consciousness},
  )
  const critical=parameters.some(p=>p.points===3)
  const status=missing.length?'INCOMPLETO':errors.length?'INVALIDO':'CALCULADO'
  const score=status==='CALCULADO'?parameters.reduce((total,p)=>total+p.points!,0):null
  const classification:MeowsResult['classification']=status==='INCOMPLETO'?'INCOMPLETO':status==='INVALIDO'?'INVALIDO':score!>=6?'ALTO_RISCO_PELO_SCORE':critical?'ALERTA_CRITICO':score!>=4?'MODERADO':score!>=1?'ALERTA_REAVALIACAO':'SEM_ALERTA_PELO_SCORE'
  return {protocolVersion:'PAP-MEOWS v1.0',validation:'DEMONSTRATIVE_NOT_CLINICALLY_VALIDATED',status,score,classification,critical,parameters,missing,errors}
}
