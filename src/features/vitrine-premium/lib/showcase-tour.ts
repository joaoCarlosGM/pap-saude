import {DEMO_TOUR_STEPS as originalSteps} from './demo/tour'
import type {TourStep} from '../types/tour'
/** Presentation adapter only. The validated core tour/data remain unchanged. */
export const DEMO_TOUR_STEPS:readonly TourStep[]=originalSteps.map(step=>{
 if(step.id==='recursos')return {...step,description:'Explore as referências em preparação de Protocolos e os recursos demonstrativos de Ferramentas. Nenhum conteúdo clínico está homologado.',navSelectors:['/vitrine/protocolos','/vitrine/ferramentas']}
 if(step.id==='chat')return {...step,title:'Recursos em preparação',description:'Chat IA e Cursos estão Em breve. Os itens são apenas informativos, sem links ou ações nesta etapa.',path:'/vitrine/protocolos',selector:'[data-tour-coming-soon="chat"]',navSelectors:[]}
 return step
})
