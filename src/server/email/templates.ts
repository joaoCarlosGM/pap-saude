/** Pure HTML/text rendering. Dynamic values are always escaped, never raw HTML. */
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
  displayName?: string;
  roleKey?: string;
  organizationName?: string;
  url: string;
  expiresAt?: Date;
  rejected?: boolean;
};

const IMAGE_URL = "https://admin-beta.papsaude.com.br/assets/email/convite-profissional.png";
const BRAND = "PAP Saúde";

function p(content: string, css = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#5d7480;${css}">${escapeHtml(content)}</p>`;
}

function detail(label: string, value: string, border = true): string {
  return `<tr><td style="padding:16px 20px;${border ? "border-bottom:1px solid #f0dce9;" : ""}">
    <p style="margin:0 0 5px;color:#e91c85;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase">${escapeHtml(label)}</p>
    <p style="margin:0;color:#064c4d;font-size:20px;line-height:1.3;font-weight:800">${escapeHtml(value)}</p>
  </td></tr>`;
}

export function transactionalTemplate(input: TransactionalTemplateInput) {
  const url = new URL(input.url);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("UNSAFE_MAIL_LINK");
  }
  if ((input.kind === "INVITATION" || input.kind === "PASSWORD_RESET") &&
      (!input.expiresAt || !Number.isFinite(input.expiresAt.getTime()))) {
    throw new Error("MAIL_EXPIRY_REQUIRED");
  }

  const role = roleLabels[input.roleKey || ""];
  const greeting = input.displayName ? `Olá, ${input.displayName}.` : "Olá.";
  const expiry = input.expiresAt
    ? `Válido até ${input.expiresAt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })} (horário de Fortaleza).`
    : "";

  const content = {
    INVITATION: {
      eyebrow: "VOCÊ ESTÁ CONVIDADA(O)",
      title: "Seu convite para o PAP Saúde chegou.",
      subject: "Você tem um convite — PAP Saúde",
      cta: "Aceitar convite",
      intro: "Você recebeu um convite individual para participar do PAP Saúde, a plataforma de apoio aos profissionais envolvidos no cuidado e acompanhamento da saúde materna.",
      notice: "Aceitar o convite cria ou confirma sua identidade. O acesso ao sistema depende de uma aprovação posterior e das permissões do perfil; o aceite não ativa uma UBS.",
      security: "Convite individual e de uso único. Não compartilhe este link. Caso não reconheça o convite, ignore esta mensagem e procure quem o enviou.",
    },
    PASSWORD_RESET: {
      eyebrow: "SEGURANÇA DA CONTA",
      title: "Recupere sua senha com segurança.",
      subject: "Recupere sua senha — PAP Saúde",
      cta: "Redefinir minha senha",
      intro: "Recebemos uma solicitação de recuperação de senha da sua conta PAP Saúde.",
      notice: "A redefinição encerra sessões anteriores. Seu aplicativo autenticador e os requisitos de autenticação multifator continuam ativos.",
      security: "Este link é individual e de uso único. Se não foi você, ignore esta mensagem. Nunca compartilhe sua senha ou códigos MFA.",
    },
    ACCESS_APPROVED: {
      eyebrow: "PERFIL AUTORIZADO",
      title: "Seu perfil foi autorizado no PAP Saúde.",
      subject: "Seu perfil foi autorizado — PAP Saúde",
      cta: "Consultar meu acesso",
      intro: "Uma autorização de perfil foi registrada na sua conta PAP Saúde.",
      notice: "Entre para consultar a situação atual e concluir as verificações de segurança. O perfil não concede acesso clínico fora do escopo autorizado e não ativa uma UBS.",
      security: "Seu acesso continua sujeito às permissões vigentes, à sessão autenticada e ao MFA quando exigido.",
    },
    UBS_ACTIVATED: {
      eyebrow: "UNIDADE ATIVADA",
      title: "Sua unidade teve a ativação registrada.",
      subject: "Ativação institucional da UBS — PAP Saúde",
      cta: "Consultar minha unidade",
      intro: `A ativação institucional de ${input.organizationName || "sua UBS"} foi registrada no PAP Saúde.`,
      notice: "Esta mensagem é destinada a um responsável com vínculo e papel ativos. A ativação da UBS é separada da autorização de perfis.",
      security: "Consulte a situação atual após login e autenticação multifator, quando exigido.",
    },
    ACCESS_CLOSED: {
      eyebrow: "ATUALIZAÇÃO DO CONVITE",
      title: input.rejected ? "Seu convite não foi autorizado." : "Seu convite foi revogado.",
      subject: `${input.rejected ? "Convite não autorizado" : "Convite revogado"} — PAP Saúde`,
      cta: "Consultar minha situação",
      intro: input.rejected ? "O convite não foi autorizado." : "O convite ou a autorização vinculada foi revogado.",
      notice: "Consulte sua situação atual na plataforma. Em caso de dúvida, entre em contato com o responsável pelo convite.",
      security: "As exigências de segurança da sua conta permanecem em vigor.",
    },
  }[input.kind];

  const isInvitation = input.kind === "INVITATION";
  const showOrganization = !!input.organizationName && input.kind !== "UBS_ACTIVATED";
  const showRole = !!role && (isInvitation || input.kind === "ACCESS_APPROVED");
  const showDetails = showOrganization || showRole;

  const textParagraphs = [
    greeting,
    content.intro,
    ...(showOrganization ? [`Organização: ${input.organizationName}.`] : []),
    ...(showRole ? [`Perfil ${isInvitation ? "proposto" : "autorizado"}: ${role}.`] : []),
    ...(expiry ? [expiry] : []),
    content.notice,
    content.security,
  ];

  const detailsHtml = !showDetails ? "" : `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
    style="border-collapse:separate;border-spacing:0;background:#fff1f8;border:1px solid #f6dfed;border-radius:18px;margin:0 0 23px">
    ${showOrganization ? detail("Sua organização", input.organizationName!, !!showRole) : ""}
    ${showRole ? detail(isInvitation ? "Perfil proposto" : "Perfil autorizado", role!, false) : ""}
  </table>`;

  const visual = `<td class="hero-photo" width="40%" valign="middle" style="padding:10px 0 10px 16px;vertical-align:middle">
      <img src="${IMAGE_URL}" width="240" alt="Profissional de saúde utilizando tecnologia"
        style="display:block;width:100%;max-width:240px;height:auto;border:0;border-radius:78px 14px 78px 14px" />
    </td>`;

  const html = `<!doctype html><html lang="pt-BR"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(content.subject)}</title>
    <style>
      @media screen and (max-width:600px) {
        .email-shell { width:100%!important; }
        .email-pad { padding-left:22px!important; padding-right:22px!important; }
        .hero-copy { display:block!important; width:100%!important; }
        .hero-photo { display:block!important; width:100%!important; padding:12px 0 0!important; }
        .hero-photo img { width:100%!important; max-width:340px!important; max-height:260px!important; object-fit:cover!important; }
        .hero-title { font-size:34px!important; }
        .email-mark { font-size:32px!important; }
        .tagline { display:none!important; }
        .email-cta { display:block!important; text-align:center!important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#fff7fb;color:#12494c;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;font-size:1px;line-height:1px;color:#fff7fb;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(content.eyebrow)} · ${escapeHtml(content.cta)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff7fb">
  <tr><td align="center" style="padding:26px 12px 34px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" class="email-shell"
    style="width:100%;max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:26px;overflow:hidden;box-shadow:0 20px 56px rgba(7,73,76,.07)">
    <tr><td class="email-pad" style="padding:35px 35px 12px;background:#fffafc">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td valign="top"><div class="email-mark" style="color:#ed1984;font-size:37px;font-weight:800;letter-spacing:-1.5px;line-height:1.15">PAP <span style="font-weight:650">Saúde</span></div>
          <div style="padding-top:9px;color:#074d50;font-size:10px;font-weight:800;letter-spacing:2.8px">BELÉM <span style="color:#ee2789">•</span> PARÁ <span style="color:#ee2789">•</span> AMAZÔNIA</div>
        </td>
        <td class="tagline" align="right" valign="top" style="padding-top:5px;color:#71859a;font-size:14px;line-height:1.35">Mais tecnologia<br />para um futuro<br />mais humano.<div style="margin:11px 0 0 auto;width:40px;height:2px;background:#f52894"></div></td>
      </tr></table>
    </td></tr>
    <tr><td class="email-pad" style="padding:34px 35px 14px;background:#fffafc">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td class="hero-copy" width="60%" valign="top" style="vertical-align:top">
          <p style="margin:0 0 15px;color:#e81e85;font-size:11px;font-weight:800;letter-spacing:2.4px">${escapeHtml(content.eyebrow)}</p>
          <h1 class="hero-title" style="margin:0 0 18px;color:#064c4d;font-size:39px;line-height:1.1;letter-spacing:-1px;font-weight:800">${escapeHtml(content.title)}</h1>
          ${p(content.intro)}
        </td>${visual}
      </tr></table>
    </td></tr>
    <tr><td class="email-pad" style="padding:8px 35px 25px">
      ${input.displayName ? p(greeting, "color:#064c4d;font-weight:700;") : ""}
      ${detailsHtml}
      ${expiry ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 19px;background:#f2f8f8;border-radius:12px"><tr>
        <td style="width:38px;padding:16px;color:#eb2288;font-size:23px" valign="middle">◷</td><td style="padding:16px 16px 16px 0;color:#365d65;font-size:14px;line-height:1.5"><strong style="color:#074d50">Link temporário e individual</strong><br />${escapeHtml(expiry)}</td>
      </tr></table>` : ""}
      ${p(content.notice)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:12px 0 20px">
        <a class="email-cta" href="${escapeHtml(url.toString())}" style="display:inline-block;background:#e9218b;color:#ffffff;font-weight:800;font-size:19px;line-height:1.3;text-align:center;text-decoration:none;padding:17px 36px;border-radius:40px">${escapeHtml(content.cta)} &nbsp; →</a>
      </td></tr></table>
      <div style="background:#f2f8f9;border-radius:15px;padding:16px 19px;margin:0 0 22px">
        <p style="margin:0;color:#0b5052;font-size:14px;font-weight:700">Seu acesso é individual e seguro</p>
        <p style="margin:6px 0 0;color:#657b8a;font-size:13px;line-height:1.55">${escapeHtml(content.security)}</p>
      </div>
      <p style="margin:0 0 6px;color:#74858c;font-size:12px">Se o botão não abrir, copie este endereço no navegador:</p>
      <p style="margin:0;color:#0d777a;font-size:12px;line-height:1.5;word-break:break-all;overflow-wrap:anywhere"><a href="${escapeHtml(url.toString())}" style="color:#0a7376;text-decoration:underline">${escapeHtml(url.toString())}</a></p>
    </td></tr>
    <tr><td class="email-pad" style="padding:20px 35px 24px;background:#fff2f8;border-top:1px solid #f8e4ef">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td valign="top" style="color:#e92289;font-size:23px;font-weight:800">PAP Saúde</td>
        <td valign="top" align="right" style="color:#637987;font-size:12px;line-height:1.5">Tecnologia a serviço da saúde materna<br />Belém · Pará · Amazônia</td>
      </tr></table>
      <p style="margin:16px 0 0;font-size:11px;color:#6d8189;line-height:1.5">Mensagem transacional. Consulte a situação atual diretamente na plataforma. Nunca informe senha ou códigos de autenticação por e-mail.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;

  return {
    subject: content.subject,
    text: `${BRAND}\n\n${content.title}\n\n${textParagraphs.join("\n\n")}\n\n${content.cta}: ${url.toString()}\n\nPAP Saúde · Cuidado conectado. Esta é uma mensagem transacional; consulte a situação atual na plataforma.`,
    html,
  };
}
