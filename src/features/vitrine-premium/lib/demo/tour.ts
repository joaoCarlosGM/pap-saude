import type {TourStep} from '../../types/tour'
export const DEMO_TOUR_STEPS: readonly TourStep[] = [
 {id:'dashboard',title:'Conheça o Dashboard',description:'Acompanhe os indicadores, gráficos e informações gerais do acompanhamento. Nesta demonstração, os dados são inteiramente fictícios.',path:'/vitrine/dashboard',selector:'[data-tour="dashboard-kpis"] > article',navSelectors:['/vitrine/dashboard']},
 {id:'registro',title:'Registre um atendimento',description:'O Registro organiza a identificação, os dados gestacionais, os sinais vitais e o histórico clínico em etapas. Utilize apenas informações demonstrativas.',path:'/vitrine/registro',selector:'[data-tour="registration"]',navSelectors:['/vitrine/registro']},
 {id:'pacientes',title:'Consulte um prontuário',description:'Selecione o cartão de uma paciente para consultar sua ficha, histórico, exames, medicações e documentos.',path:'/vitrine/pacientes',selector:'[data-patient-id]',navSelectors:['/vitrine/pacientes']},
 {id:'atendimentos',title:'Explore os atendimentos',description:'Consulte o histórico, utilize filtros e selecione um atendimento para visualizar os detalhes.',path:'/vitrine/atendimentos',selector:'[data-tour="attendance-filters"]',navSelectors:['/vitrine/atendimentos']},
 {id:'recursos',title:'Conheça os recursos da plataforma',description:'Explore Protocolos, Ferramentas e Cursos. Alguns recursos são apresentados apenas para demonstração.',path:'/vitrine/protocolos',selector:'[data-tour="resources"] article',navSelectors:['/vitrine/protocolos','/vitrine/ferramentas','/vitrine/cursos']},
 {id:'chat',title:'Conheça o assistente PAP Saúde',description:'O Chat IA apresenta a experiência planejada para o assistente clínico. Nesta versão, as respostas são simuladas e não representam uma análise real por inteligência artificial.',path:'/vitrine/chat',selector:'[data-tour="chat"]',navSelectors:['/vitrine/chat']},
]

export {authorizedTourSteps,placeTour} from "../onboarding/tour"
