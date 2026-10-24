/** Pure HTML/text rendering. Dynamic values are always escaped, never HTML. */
export function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
export const roleLabels: Record<string, string> = {
  PAP_MANAGER: "Gerente PAP", COMMERCIAL: "Comercial", PROFESSIONAL: "Profissional",
  HEALTH_UNIT_ADMIN: "Responsável pela UBS", MUNICIPAL_ADMIN: "Administrador municipal",
};
export type TransactionalTemplateInput = {
  kind: "INVITATION" | "PASSWORD_RESET" | "ACCESS_APPROVED" | "UBS_ACTIVATED" | "ACCESS_CLOSED";
  displayName?: string; roleKey?: string; organizationName?: string;
  url: string; expiresAt?: Date; rejected?: boolean;
};
export function transactionalTemplate(input: TransactionalTemplateInput) {
  const url = new URL(input.url);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("UNSAFE_MAIL_LINK");
  if ((input.kind === "INVITATION" || input.kind === "PASSWORD_RESET") &&
      (!input.expiresAt || !Number.isFinite(input.expiresAt.getTime())))
    throw new Error("MAIL_EXPIRY_REQUIRED");
  const validity = input.expiresAt ? `Válido até ${input.expiresAt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })} (horário de Fortaleza).` : "";
  const role = roleLabels[input.roleKey || ""];
  const greeting = input.displayName ? `Olá, ${input.displayName}.` : "Olá.";
  const content = {
    INVITATION: {
      title: "Você tem um convite", cta: "Aceitar convite",
      paragraphs: [greeting, input.organizationName ? `A ${input.organizationName} convida você para o PAP Saúde.` : "Você recebeu um convite individual para o PAP Saúde.",
        ...(role ? [`Perfil proposto: ${role}.`] : []), validity,
        "O aceite não libera acesso operacional automaticamente: cria ou confirma sua identidade. O acesso operacional depende da autorização legítima do perfil e do vínculo; não ativa uma UBS.",
        "Link individual de uso único. Não compartilhe. Se não esperava este convite, ignore a mensagem e procure o responsável pelo convite."],
    },
    PASSWORD_RESET: {
      title: "Recupere sua senha", cta: "Redefinir minha senha",
      paragraphs: [greeting, "Recebemos um pedido de recuperação da sua conta PAP Saúde.", validity,
        "O link é individual e de uso único. Se não foi você, ignore esta mensagem. Sua senha permanece a mesma até a confirmação.",
        "Após a redefinição, suas sessões serão encerradas. Seu aplicativo autenticador e os requisitos de MFA continuam ativos. Nunca informe senha ou códigos de autenticação por e-mail."],
    },
    ACCESS_APPROVED: {
      title: "Seu perfil foi autorizado", cta: "Consultar meu acesso",
      paragraphs: [greeting, "Uma autorização de perfil foi registrada na sua conta PAP Saúde.",
        ...(role ? [`Perfil autorizado: ${role}.`] : []),
        "Entre para consultar a situação atual e concluir a verificação de segurança exigida. A autorização de perfil não ativa UBS nem concede acesso clínico fora do escopo autorizado."],
    },
    UBS_ACTIVATED: {
      title: "Ativação institucional da UBS", cta: "Consultar minha unidade",
      paragraphs: [greeting, `A ativação institucional de ${input.organizationName || "sua UBS"} foi registrada no PAP Saúde.`,
        "Esta mensagem é destinada a um responsável com vínculo e papel ativos na unidade. A ativação da UBS é separada da autorização de perfis. Consulte a situação atual após login e MFA, quando exigido."],
    },
    ACCESS_CLOSED: {
      title: input.rejected ? "Convite não autorizado" : "Convite revogado", cta: "Consultar minha situação",
      paragraphs: [greeting, input.rejected ? "O convite não foi autorizado." : "O convite ou a autorização vinculada foi revogado.",
        "Consulte sua situação atual na plataforma. Para esclarecer a decisão, entre em contato com o responsável pelo convite. Sua segurança de conta permanece disponível."],
    },
  }[input.kind];
  const paragraphs = content.paragraphs.filter(Boolean);
  const subject = `${content.title} — PAP Saúde`;
  return {
    subject,
    text: `PAP Saúde\n\n${content.title}\n\n${paragraphs.join("\n\n")}\n\n${content.cta}: ${url.toString()}\n\nPAP Saúde · Cuidado conectado. Esta é uma mensagem transacional; a situação atual deve ser consultada na plataforma.`,
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:16px 8px;background:#eff6f5;color:#203d3e;font-family:Arial,Helvetica,sans-serif;line-height:1.6"><table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff"><tr><td style="padding:28px 24px;background:#064f50;color:#ffffff"><p style="margin:0;font-size:25px;font-weight:700">PAP Saúde</p><p style="margin:4px 0 0;font-size:14px">Cuidado conectado</p></td></tr><tr><td style="padding:28px 24px"><h1 style="margin:0 0 24px;font-size:26px;line-height:1.3;color:#064f50">${escapeHtml(content.title)}</h1>${paragraphs.map(p => `<p style="margin:0 0 18px;overflow-wrap:anywhere">${escapeHtml(p)}</p>`).join("")}<p style="margin:28px 0"><a href="${escapeHtml(url.toString())}" style="display:inline-block;background:#064f50;color:#ffffff;text-decoration:underline;font-size:16px;font-weight:700;padding:16px 22px;border-radius:10px">${escapeHtml(content.cta)}</a></p><p style="font-size:14px">Se o botão não abrir, copie o endereço abaixo para o navegador:</p><p style="font-size:13px;word-break:break-all">${escapeHtml(url.toString())}</p></td></tr><tr><td style="padding:20px 24px;background:#e6f2ef;color:#244848;font-size:13px">PAP Saúde · Mensagem transacional. A situação atual deve ser consultada na plataforma. Nunca envie senha ou códigos de autenticação por e-mail.</td></tr></table></body></html>`,
  };
}
