"use client";
import GuidedTourEngine from "@/components/onboarding/GuidedTourEngine";
import type { GuidedTourStep } from "@/lib/onboarding/types";
const steps:GuidedTourStep[]=[
  {id:"profile",title:"Seu espaço de trabalho",description:"Confira sua identidade e seus vínculos autorizados. Trocar de área não altera permissões.",target:'[data-tour="clinical-profile"]'},
  {id:"dashboard",title:"Indicadores operacionais",description:"Contagens reais das UBS autorizadas. Classificação MEOWS assistencial permanece indisponível.",target:'[data-tour="clinical-dashboard"]',requiredAny:["encounter.read"]},
  {id:"patients",title:"Pacientes",description:"Pesquise pacientes vinculadas às unidades autorizadas. As fichas contêm registros operacionais.",target:'[data-tour="clinical-pacientes"]',requiredAny:["patient.read"]},
  {id:"registration",title:"Registro e atendimentos",description:"O Registro mantém identidade idempotente, autorização e histórico. Conclusões impedem novas edições incompatíveis.",target:'[data-tour="clinical-registro"]',requiredAny:["encounter.create"]},
  {id:"support",title:"Recursos e segurança",description:"Recursos ainda sem serviço homologado são apresentados como indisponíveis. Configurações e Segurança usam sua conta real.",target:'[data-tour="clinical-configuracoes"]'},
];
export default function ClinicalTour({permissions}:{permissions:string[]}){
  return <GuidedTourEngine tourKey="clinical-core" tourVersion={1} steps={steps} permissions={permissions}/>;
}
