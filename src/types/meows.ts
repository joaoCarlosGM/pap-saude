export type MeowsClassification = 'INCOMPLETO' | 'INVALIDO' | 'ALTO_RISCO_PELO_SCORE' | 'ALERTA_CRITICO' | 'MODERADO' | 'ALERTA_REAVALIACAO' | 'SEM_ALERTA_PELO_SCORE'
export type MeowsParameterKey = 'PAS' | 'PAD' | 'FC' | 'FR' | 'TEMPERATURA' | 'OXIGENIO' | 'CONSCIENCIA'
export type MeowsParameter = { key:MeowsParameterKey; parameter:string; value:string; points:number|null }
export type MeowsResult = {
  protocolVersion:'PAP-MEOWS v1.0'
  validation:'DEMONSTRATIVE_NOT_CLINICALLY_VALIDATED'
  status:'CALCULADO'|'INCOMPLETO'|'INVALIDO'
  score:number|null
  classification:MeowsClassification
  critical:boolean
  parameters:MeowsParameter[]
  missing:MeowsParameterKey[]
  errors:Array<{parameter:MeowsParameterKey;message:string}>
}
