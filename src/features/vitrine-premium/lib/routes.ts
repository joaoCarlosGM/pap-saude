export const PREMIUM_SECTIONS=['dashboard','registro','atendimentos','pacientes','chat','protocolos','ferramentas','cursos','configuracoes','ajuda'] as const
export type PremiumSection=typeof PREMIUM_SECTIONS[number]
export function isPremiumSection(value:string):value is PremiumSection{return (PREMIUM_SECTIONS as readonly string[]).includes(value)}
