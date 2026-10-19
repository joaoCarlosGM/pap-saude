import {
  EmailDeliveryError,
} from "@/server/invitations/invitation.errors"

function escapeHtml(
  value: string,
) {
  return value
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    )
}

export type InvitationEmailInput = {
  to: string
  displayName: string
  organizationName: string
  invitationUrl: string
}

export type EmailDeliveryResult =
  | {
      mode:
        "DEVELOPMENT"
    }
  | {
      mode:
        "RESEND"
    }

export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<EmailDeliveryResult> {
  const provider =
    process.env.PAP_EMAIL_PROVIDER
      ?.trim()
      .toLowerCase()

  if (
    provider !== "resend"
  ) {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new EmailDeliveryError()
    }

    return {
      mode:
        "DEVELOPMENT",
    }
  }

  const apiKey =
    process.env.RESEND_API_KEY
      ?.trim()

  const from =
    process.env.PAP_EMAIL_FROM
      ?.trim()

  if (
    !apiKey ||
    !from
  ) {
    throw new EmailDeliveryError()
  }

  const safeName =
    escapeHtml(
      input.displayName,
    )

  const safeOrganization =
    escapeHtml(
      input.organizationName,
    )

  const safeUrl =
    escapeHtml(
      input.invitationUrl,
    )

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            from,
            to: [
              input.to,
            ],

            subject:
              "Convite para o PAP Saúde",

            text:
              `Olá, ${input.displayName}.\n\n` +
              `Você recebeu um convite para acessar o PAP Saúde pela ${input.organizationName}.\n\n` +
              `Ative seu acesso: ${input.invitationUrl}\n\n` +
              "Este link é individual, temporário e só pode ser utilizado uma vez.",

            html:
              `<p>Olá, ${safeName}.</p>` +
              `<p>Você recebeu um convite para acessar o <strong>PAP Saúde</strong> pela ${safeOrganization}.</p>` +
              `<p><a href="${safeUrl}">Ativar meu acesso</a></p>` +
              "<p>Este link é individual, temporário e só pode ser utilizado uma vez.</p>",
          }),
      },
    )

  if (!response.ok) {
    throw new EmailDeliveryError()
  }

  return {
    mode:
      "RESEND",
  }
}
