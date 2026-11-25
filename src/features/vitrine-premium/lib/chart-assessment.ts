import type {Atendimento} from '../types/atendimento'

export function recordedAssessments(encounters: readonly Atendimento[] = []) {
  return encounters.filter(
    visit => visit.assessmentSource === 'PAP_MEOWS_DEMO' && visit.assessment
  ).toSorted((a,b) => a.dataHora.localeCompare(b.dataHora) || a.id.localeCompare(b.id))
}

export function completeAssessments(encounters: readonly Atendimento[] = []) {
  return recordedAssessments(encounters).filter(visit =>
    visit.assessment?.status === 'CALCULADO' && visit.assessment.score !== null)
}

export function assessmentFlags(encounters: readonly Atendimento[] = []) {
  const visit = recordedAssessments(encounters).at(-1)
  const flags = visit?.assessment?.status === 'CALCULADO'
    ? visit.assessment.parameters.filter(parameter => parameter.points === 3) : []
  return {visit,flags}
}

export function assessmentTrend(encounters: readonly Atendimento[] = []) {
  return completeAssessments(encounters).map(visit => ({label:'C'+visit.consultaNumero,value:visit.assessment!.score!}))
}
