import { EmailDeliveryError } from "@/server/invitations/invitation.errors";
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
export function invitationBaseUrl() {
  const production = process.env.NODE_ENV === "production";
  try {
    const base = new URL(
      process.env.PAP_PUBLIC_URL?.trim() ||
        (production ? "" : "http://localhost:3000"),
    );
    const allowed = (process.env.PAP_EMAIL_ALLOWED_HOSTS || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (
      !["https:", "http:"].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== "/" ||
      (production &&
        (base.protocol !== "https:" || !allowed.includes(base.host)))
    )
      throw new Error();
    return base.origin;
  } catch {
    throw new EmailDeliveryError();
  }
}
export type InvitationEmailInput = {
  to: string;
  displayName: string;
  organizationName: string;
  invitationUrl: string;
  invitationId?: string;
};
export type EmailDeliveryResult =
  { mode: "DEVELOPMENT" } | { mode: "RESEND"; providerMessageId: string };
export function invitationTemplate(input: InvitationEmailInput) {
  const name = escapeHtml(input.displayName),
    organization = escapeHtml(input.organizationName),
    url = escapeHtml(input.invitationUrl);
  return {
    subject: "Ative seu acesso institucional — PAP Saúde",
    text: `Olá, ${input.displayName}.\n\nA ${input.organizationName} convida você para o PAP Saúde.\nAtive seu acesso: ${input.invitationUrl}\n\nLink individual, de uso único e válido por 48 horas. Se não esperava este convite, ignore-o e entre em contato com o administrador da sua UBS. Nunca compartilhe o link.`,
    html: `<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#eff6f5;font-family:Arial,sans-serif;color:#172e30"><table role="presentation" style="width:100%;max-width:600px;margin:auto;background:white;border-radius:24px"><tr><td style="padding:32px"><h1 style="color:#064f50">PAP Saúde</h1><h2>Seu acesso institucional</h2><p>Olá, ${name}.</p><p>A <strong>${organization}</strong> convida você para o PAP Saúde.</p><p style="padding:20px 0"><a href="${url}" style="display:inline-block;background:#064f50;color:white;padding:16px 24px;border-radius:12px">Ativar meu acesso</a></p><p>Link individual, de uso único e válido por 48 horas. Nunca compartilhe este link.</p><p>Não esperava este convite ou precisa de suporte? Entre em contato com o administrador da sua UBS.</p></td></tr></table></body></html>`,
  };
}
export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<EmailDeliveryResult> {
  // Validate a configured origin, even in development; request Host never participates.
  const expected = invitationBaseUrl();
  if (new URL(input.invitationUrl).origin !== expected)
    throw new EmailDeliveryError();
  if (process.env.PAP_EMAIL_PROVIDER?.trim().toLowerCase() !== "resend") {
    if (process.env.NODE_ENV === "production") throw new EmailDeliveryError();
    return { mode: "DEVELOPMENT" };
  }
  const apiKey = process.env.RESEND_API_KEY?.trim(),
    from = process.env.PAP_EMAIL_FROM?.trim();
  if (!apiKey || !from || /[\r\n]/.test(from)) throw new EmailDeliveryError();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(input.invitationId
          ? { "Idempotency-Key": `pap-invitation/${input.invitationId}` }
          : {}),
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        ...invitationTemplate(input),
      }),
    });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (typeof data.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.id))
      throw new Error();
    return { mode: "RESEND", providerMessageId: data.id }; // Accepted by provider, NOT inbox delivery.
  } catch {
    throw new EmailDeliveryError();
  }
}
