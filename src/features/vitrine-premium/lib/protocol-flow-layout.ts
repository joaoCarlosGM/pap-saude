/** Coordinates transcribed against the corresponding authenticated figures. */
export type FigureCrop = readonly [left:number,top:number,right:number,bottom:number]

export const flowLanes: Record<string,readonly (readonly (string|null)[])[]> = {
  'sindromes-hipertensivas-gestacao': [
    [null,'escala'], ['sinais','criterios','rotina'], ['monitorizacao','sulfato','ordem'],
    [null,'ataque','antidoto'], ['oxigenio','manutencao','exames'], [null,'anti-hipertensiva'],
    [null,'ordem-medicacao'], [null,'pressao','parto'], [null,'avaliacao','toxicidade'],
  ],
  'hemorragia-pos-parto': [
    [null,'ativacao'], [null,'equipe'], [null,'ressuscitacao'], ['tonus','causa','trauma'],
    ['tecido',null,'trombina'], [null,'tamponamento','retirada'], [null,'cirurgia','interrupcao'],
    [null,'reavaliacao'],
  ],
  'sepse-obstetrica': [
    [null,'reconheca','equipe'], ['omqsofa','triagem','meows'], [null,'ressuscite'], [null,'acesso','kit'],
    [null,'volume'], [null,'responda'], [null,'cirurgia'], [null,'reavalie'],
    ['materna',null,'fetal'], ['estavel','instabilidade'], ['monitorar','uti'],
  ],
}

// Bounds normalized to the complete PDF page, as rendered by PDF.js.
export const figureCrops: Record<string,Record<string,FigureCrop>> = {
 'sindromes-hipertensivas-gestacao': {
  escala:[.045,.21,.45,.244], sinais:[.465,.174,.94,.223], criterios:[.065,.25,.73,.353], rotina:[.75,.233,.94,.305],
  monitorizacao:[.472,.365,.712,.408], sulfato:[.08,.365,.45,.409], ordem:[.7,.31,.94,.45], ataque:[.05,.425,.403,.57],
  antidoto:[.05,.57,.44,.635], manutencao:[.405,.415,.89,.575], 'anti-hipertensiva':[.52,.567,.7,.64],
  'ordem-medicacao':[.05,.633,.916,.732], pressao:[.485,.737,.687,.822], parto:[.71,.756,.958,.799],
  avaliacao:[.05,.826,.56,.919], oxigenio:[.054,.74,.493,.782], exames:[.054,.779,.493,.824], toxicidade:[.623,.829,.947,.926],
 },
 'hemorragia-pos-parto': {
  ativacao:[.263,.274,.856,.314], equipe:[.273,.308,.87,.523], ressuscitacao:[.273,.522,.87,.62], causa:[.273,.616,.87,.745],
  tonus:[.381,.636,.857,.66], trauma:[.381,.66,.857,.687], tecido:[.381,.687,.857,.711], trombina:[.381,.71,.857,.739],
  tamponamento:[.273,.737,.873,.838], retirada:[.696,.753,.856,.835], interrupcao:[.696,.799,.856,.835],
  cirurgia:[.273,.834,.87,.883], reavaliacao:[.29,.876,.83,.902],
 },
 'sepse-obstetrica': {
  reconheca:[.191,.107,.354,.154], equipe:[.408,.105,.794,.154], triagem:[.192,.184,.352,.227],
  omqsofa:[.407,.156,.568,.247], meows:[.566,.156,.794,.247], ressuscite:[.185,.267,.794,.318],
  acesso:[.185,.315,.794,.362], kit:[.122,.818,.932,.839], volume:[.185,.363,.794,.443],
  responda:[.188,.459,.796,.507], cirurgia:[.188,.506,.796,.616], reavalie:[.201,.621,.343,.651],
  materna:[.18,.657,.272,.701], fetal:[.415,.647,.792,.714], estavel:[.194,.699,.384,.733], instabilidade:[.413,.711,.792,.802],
  monitorar:[.18,.738,.287,.797], uti:[.302,.739,.369,.798],
 },
}
