import type {ClassificacaoAtendimento} from '../../types/atendimento'
export const DEMO_ASSESSMENT_NOTICE='Resultado demonstrativo. Protocolo ainda não homologado para uso assistencial nesta plataforma.'
type Group='low'|'attention'|'urgent'|'unassessed'
const labels:Record<ClassificacaoAtendimento,[string,Group]>={
 BAIXO_RISCO:['Baixo risco (ilustrativo)','low'],ATENCAO:['Atenção (ilustrativa)','attention'],URGENCIA:['Urgência (ilustrativa)','urgent'],NAO_AVALIADO:['Não avaliado','unassessed'],
 INCOMPLETO:['Incompleto','unassessed'],INVALIDO:['Inválido','unassessed'],SEM_ALERTA_PELO_SCORE:['Sem alerta pelo score (demo)','low'],ALERTA_REAVALIACAO:['Alerta de reavaliação (demo)','attention'],MODERADO:['Moderado (demo)','attention'],ALERTA_CRITICO:['Parâmetro crítico (demo)','urgent'],ALTO_RISCO_PELO_SCORE:['Alto score (demo)','urgent'],
}
// Grouping is presentation only, never a clinically validated equivalence or decision.
export function assessmentPresentation(key:ClassificacaoAtendimento){
 const [label,group]=labels[key]||['Não avaliado','unassessed']
 const className=({low:'border-emerald-100 bg-emerald-50 text-emerald-600',attention:'border-amber-100 bg-amber-50 text-amber-600',urgent:'border-red-100 bg-red-50 text-red-600',unassessed:'border-slate-100 bg-slate-50 text-slate-600'})[group]
 return {label,group,className}
}
