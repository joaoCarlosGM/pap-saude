/** Delivery observations, never inferred inbox receipt. Legacy labels stay honest. */
export function emailDeliveryLabel(status: string) {
  return ({
    PENDING: "aguardando tentativa de envio",
    SENDING: "tentativa de envio em andamento",
    CAPTURED: "capturado na caixa local; não enviado externamente",
    ACCEPTED_BY_PROVIDER: "aceito pelo provedor; entrega ainda não comprovada",
    SENT: "aceito pelo provedor; entrega ainda não comprovada (registro legado)",
    DELIVERED: "entrega ao servidor destinatário comprovada pelo provedor; leitura não comprovada",
    BOUNCED: "mensagem devolvida pelo servidor destinatário",
    COMPLAINED: "reclamação de spam informada pelo provedor",
    FAILED: "falha no envio; entrega não comprovada",
    NOT_REQUESTED: "envio não solicitado ou cancelado",
    NOT_ATTEMPTED: "envio ainda não tentado",
    DEVELOPMENT: "registro legado de desenvolvimento; entrega externa não comprovada",
  } as Record<string, string>)[status] || "estado de entrega não reconhecido";
}
