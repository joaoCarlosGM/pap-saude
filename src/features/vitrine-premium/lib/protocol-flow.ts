type NodeKind = 'entrada' | 'etapa' | 'decisão' | 'referência'
export type SourceNode = {
  id: string
  title: string
  kind: NodeKind
  next: {id: string; label?: string}[]
  note?: string
}

const node = (id: string, title: string, kind: NodeKind, next: SourceNode['next'] = [], note?: string): SourceNode => ({id, title, kind, next, note})
const to = (id: string, label?: string) => ({id, label})

/** Documentary navigation. Clinical thresholds, prescriptions and exact criteria remain in the private figure. */
export const sourceFlows: Record<string, SourceNode[]> = {
  'sindromes-hipertensivas-gestacao': [
    // PRT.UMUL.012 v01, digital/printed 22.
    node('escala', 'Escala de alerta precoce', 'entrada', [to('criterios')]),
    node('criterios', 'Critérios indicados na figura', 'decisão', [to('rotina', 'Não'), to('monitorizacao', 'Sim')],
      'A decisão reúne pressão arterial, sinais clínicos, eclâmpsia e critérios de síndrome HELLP. Confira os critérios completos na figura.'),
    node('rotina', 'Atendimento conforme a rotina do setor', 'etapa'),
    node('monitorizacao', 'Sulfato de magnésio e monitorização', 'etapa', [to('ataque')], 'A figura apresenta monitorização e oxigênio neste ponto.'),
    node('ataque', 'Dose de ataque · referência na figura', 'referência', [to('manutencao')]),
    node('manutencao', 'Dose de manutenção e monitorização', 'etapa', [to('anti-hipertensiva')]),
    node('anti-hipertensiva', 'Terapia anti-hipertensiva', 'etapa', [to('pressao')], 'Consulte no original as opções e a ordem indicada.'),
    node('pressao', 'Estabilização da PA?', 'decisão', [to('parto', 'Sim'), to('avaliacao', 'Não')]),
    node('parto', 'Planejamento do momento do parto', 'etapa'),
    node('avaliacao', 'Avaliação laboratorial e estabilização clínica', 'etapa',
      [], 'As observações sobre exames, toxicidade e necessidade de UTI permanecem na figura.'),
  ],
  'hemorragia-pos-parto': [
    // PRT.UMUL.003 v03, digital/printed 32.
    node('ativacao', 'Critérios de ativação do protocolo na figura', 'entrada', [to('equipe')],
      'A figura relaciona volume de sangramento e alterações clínicas. Consulte as condições de ativação no original.'),
    node('equipe', 'Acionamento da equipe e estabilização inicial', 'etapa', [to('ressuscitacao')]),
    node('ressuscitacao', 'Ressuscitação hemodinâmica', 'etapa', [to('causa')],
      'A figura distingue reposição volêmica, concentrado de hemácias e protocolo de transfusão maciça.'),
    node('causa', 'Identificação da causa: tônus, trauma, tecido, trombina', 'etapa', [
      to('tonus','Consultar causa'), to('trauma','Consultar causa'), to('tecido','Consultar causa'), to('trombina','Consultar causa'), to('tamponamento','Passo seguinte na figura'),
    ]),
    node('tonus', 'Tônus · atonia uterina', 'referência', [to('causa','Voltar às causas')]),
    node('trauma', 'Trauma · lacerações e hematoma', 'referência', [to('causa','Voltar às causas')]),
    node('tecido', 'Tecido · retenção placentária', 'referência', [to('causa','Voltar às causas')]),
    node('trombina', 'Trombina · coagulopatia', 'referência', [to('causa','Voltar às causas')]),
    node('tamponamento', 'Dispositivos de tamponamento', 'etapa', [to('retirada','Consultar retirada'), to('cirurgia','Falha no controle')],
      'A indicação do passo cirúrgico na figura depende de falha da terapia farmacológica e do dispositivo no controle do sangramento.'),
    node('retirada', 'Retirada gradual com monitorização', 'etapa', [to('interrupcao','Sangramento reaparece')]),
    node('interrupcao', 'Interrupção da retirada · referência na figura', 'referência', [],
      'Confira na figura o ajuste de volume indicado se o sangramento reaparecer durante a retirada.'),
    node('cirurgia', 'Abordagem cirúrgica', 'etapa', [to('reavaliacao','Orientação transversal da figura')]),
    node('reavaliacao', 'Reavaliação contínua e registro das intervenções', 'referência', [],
      'A orientação no rodapé vale para todo o fluxo.'),
  ],
  'sepse-obstetrica': [
    // PRT.DMED.013 v2, Apêndice A, digital 15 (duplicado na 32), impressa 15 de 17.
    node('reconheca', 'Reconheça · fatores de risco e sinais', 'entrada', [to('triagem')]),
    node('triagem', 'Triagem com OmqSOFA e/ou MEOWS', 'etapa', [to('ressuscite')],
      'Os critérios da figura e o acionamento da equipe estão no original.'),
    node('ressuscite', 'Ressuscite · oxigenação', 'etapa', [to('acesso')]),
    node('acesso', 'Acesso venoso e coleta do kit sepse', 'etapa', [to('volume')]),
    node('volume', 'Prova de volume', 'etapa', [to('responda')],
      'As condições de pressão e lactato e a observação sobre congestão constam da figura.'),
    node('responda', 'Responda · antibióticos', 'etapa', [to('cirurgia')]),
    node('cirurgia', 'Avaliação cirúrgica', 'etapa', [to('reavalie')]),
    node('reavalie', 'Reavalie · caixa de antibióticos na figura', 'etapa', [to('materna'), to('fetal')],
      'A sequência original repete a caixa de antibióticos. A figura permanece disponível para esclarecer sua leitura.'),
    node('materna', 'Reavaliação materna', 'etapa', [to('estavel')]),
    node('fetal', 'Avaliação fetal', 'etapa'),
    node('estavel', 'Estável?', 'decisão', [to('monitorar', 'Sim'), to('uti', 'Não')],
      'Os critérios de instabilidade na figura incluem pressão, respiração, diurese e nível de consciência.'),
    node('monitorar', 'Monitoramento de parâmetros', 'etapa'),
    node('uti', 'Internação em UTI', 'etapa'),
  ],
}
