import {PREMIUM_SECTIONS} from '@/features/vitrine-premium/lib/routes';
/** Deployment availability, never a substitute for the global COMMERCIAL + MFA guard. */
export function betaCommercialEnabled(value: string | undefined) { return value === "1"; }
export const BETA_DEMO_PATIENT_IDS=['maria-gracas','fernanda-costa','juliana-pereira'] as const;
export const BETA_DEMO_COURSE_IDS=['pre-natal','hipertensao-gestacao','acompanhamento','protocolos','seguranca-paciente','urgencias-obstetricas'] as const;
export const BETA_COMMERCIAL_PAGES: readonly string[] = ['/comercial','/vitrine',...PREMIUM_SECTIONS.map(section=>'/vitrine/'+section)];
// No operational UUID, arbitrary identifier or unrestricted /vitrine/ prefix.
export const BETA_COMMERCIAL_PATTERNS: readonly string[] = [
 `/vitrine/pacientes/(?:${BETA_DEMO_PATIENT_IDS.join('|')}|demo-patient-[1-9][0-9]{0,5})`,
 `/vitrine/aprender/(?:${BETA_DEMO_COURSE_IDS.join('|')})`,
];
export function betaCommercialPathAllowed(path: string, method: string) {
  return ["GET", "HEAD"].includes(method) && (BETA_COMMERCIAL_PAGES.includes(path) || BETA_COMMERCIAL_PATTERNS.some(pattern => new RegExp(`^${pattern}$`).test(path)));
}
