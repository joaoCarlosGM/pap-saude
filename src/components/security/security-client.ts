import type { EffectiveAccessProfile } from "@/lib/admin/types";
export type Enrollment = {
  factorId: string;
  secret: string;
  provisioningUri: string;
  expiresAt: string;
};
export type SecurityPosture = {
  factors: {
    id: string;
    status: string;
    expiresAt: string | null;
    expired: boolean;
  }[];
  remainingRecoveryCodes: number;
  sessions: { id: string; current: boolean; userAgent: string | null }[];
  onboarding: {
    mfaRequired: boolean;
    verified: boolean;
    active: boolean;
    progress: { currentStep: number; status: string } | null;
    profile: EffectiveAccessProfile | null;
  };
};
export const securityMessages: Record<string, string> = {
  INVALID_REAUTH:
    "Senha atual ou segundo fator incorreto. Confira os campos de reautenticação.",
  INVALID_MFA_CODE:
    "Código inválido ou expirado. Use os seis dígitos atuais. Ative data e hora automáticas no celular e no computador; fusos diferentes não são problema.",
  MFA_ENROLLMENT_EXPIRED:
    "Configuração expirou. Gere uma nova chave explicitamente para reiniciar.",
  MFA_ENROLLMENT_REPLACED:
    "Esta configuração não está mais disponível. Uma nova chave pode ter substituído a anterior. Retome a configuração.",
  MFA_PENDING_EXISTS:
    "Já existe uma configuração pendente. Retome ou confirme a geração de uma nova chave.",
  MFA_ALREADY_ENABLED:
    "MFA já está ativo. Atualize a página; este fluxo não substitui fatores ativos.",
  UNAUTHENTICATED:
    "Sessão expirou. Entre novamente para retomar com segurança.",
  REQUEST_REJECTED:
    "Origem da solicitação recusada. Abra o endereço oficial deste ambiente e tente novamente.",
  REAUTH_THROTTLED:
    "Muitas tentativas. Aguarde dez minutos antes de tentar novamente.",
  TRY_LATER: "Muitas tentativas. Aguarde antes de tentar novamente.",
  MFA_LOGIN_REQUIRED:
    "Conclua a recuperação e faça um novo login com segundo fator antes de continuar.",
  MFA_REQUIRED:
    "Seu papel exige MFA. Conclua a configuração para acessar a administração.",
  RECOVERY_REQUIRED:
    "Configure MFA e gere códigos de recuperação antes de confirmar o armazenamento.",
  INVALID_PASSWORD:
    "A nova senha deve atender à política de segurança: pelo menos 12 caracteres.",
};
export async function securityRequest(
  action?: string,
  extras: Record<string, unknown> = {},
) {
  const response = await fetch(
    "/api/auth/security",
    action
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extras }),
          cache: "no-store",
        }
      : { cache: "no-store" },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      securityMessages[body.error] ||
        "Não foi possível concluir. Verifique sua conexão e tente novamente.",
    );
  return body;
}
