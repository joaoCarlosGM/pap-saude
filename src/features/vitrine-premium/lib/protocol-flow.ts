type NodeKind = 'entrada' | 'etapa' | 'decisão'
export type SourceNode = {
  id: string
  title: string
  kind: NodeKind
  next: {id: string; label?: string}[]
}

const node = (id: string, title: string, kind: NodeKind, next: SourceNode['next'] = []): SourceNode => ({id, title, kind, next})
const to = (id: string, label?: string) => ({id, label})

/** Documentary map of the headings and visible connections. Conditions, thresholds and doses stay in the source. */
export const sourceFlows: Record<string, SourceNode[]> = {
  'sindromes-hipertensivas-gestacao': [
    node('escala', 'Escala de alerta precoce', 'entrada', [to('criterios')]),
    node('criterios', 'Critérios indicados na figura', 'decisão', [to('rotina', 'Não'), to('monitorizacao', 'Sim')]),
    node('rotina', 'Atendimento conforme a rotina do setor', 'etapa'),
    node('monitorizacao', 'Sulfato de magnésio e monitorização', 'etapa', [to('anti-hipertensiva')]),
    node('anti-hipertensiva', 'Terapia anti-hipertensiva', 'etapa', [to('pressao')]),
    node('pressao', 'Estabilização da PA?', 'decisão', [to('parto', 'Sim'), to('avaliacao', 'Não')]),
    node('parto', 'Planejamento do momento do parto', 'etapa'),
    node('avaliacao', 'Avaliação laboratorial e estabilização clínica', 'etapa'),
  ],
  'hemorragia-pos-parto': [
    node('equipe', 'Acionamento da equipe e estabilização inicial', 'entrada', [to('ressuscitacao')]),
    node('ressuscitacao', 'Ressuscitação hemodinâmica', 'etapa', [to('causa')]),
    node('causa', 'Identificação da causa: tônus, trauma, tecido, trombina', 'etapa', [to('tamponamento')]),
    node('tamponamento', 'Dispositivos de tamponamento', 'etapa', [to('cirurgia')]),
    node('cirurgia', 'Abordagem cirúrgica', 'etapa'),
  ],
  'sepse-obstetrica': [
    node('reconheca', 'Reconheça', 'entrada', [to('ressuscite')]),
    node('ressuscite', 'Ressuscite', 'etapa', [to('responda')]),
    node('responda', 'Responda', 'etapa', [to('reavalie')]),
    node('reavalie', 'Reavalie', 'etapa', [to('materna'), to('fetal')]),
    node('materna', 'Reavaliação materna', 'etapa', [to('estavel')]),
    node('fetal', 'Avaliação fetal', 'etapa'),
    node('estavel', 'Estável?', 'decisão', [to('monitorar', 'Sim'), to('uti', 'Não')]),
    node('monitorar', 'Monitoramento de parâmetros', 'etapa'),
    node('uti', 'Internação em UTI', 'etapa'),
  ],
}
