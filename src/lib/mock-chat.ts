import type {
  ChatConversation,
} from "@/types/chat"

export const mockChatConversations: ChatConversation[] = [
  {
    id: "conversation-1",
    title: "Hipertensão gestacional",
    updatedAt: "2026-09-13T10:35:00",
    messages: [
      {
        id: "message-1",
        role: "USER",
        content:
          "Quais informações devo observar no acompanhamento de uma gestante com hipertensão?",
        createdAt: "2026-09-13T10:30:00",
      },

      {
        id: "message-2",
        role: "ASSISTANT",
        content:
          "Posso ajudar a organizar os dados clínicos e destacar informações relevantes do atendimento. Para decisões assistenciais, utilize os protocolos clínicos validados pela sua instituição e a avaliação do profissional responsável.",
        createdAt: "2026-09-13T10:31:00",
      },
    ],
  },

  {
    id: "conversation-2",
    title: "Resumo do atendimento",
    updatedAt: "2026-09-12T17:10:00",
    messages: [
      {
        id: "message-3",
        role: "USER",
        content:
          "Pode organizar os principais dados desse atendimento em um resumo?",
        createdAt: "2026-09-12T17:08:00",
      },

      {
        id: "message-4",
        role: "ASSISTANT",
        content:
          "Sim. Posso estruturar o resumo em identificação, dados gestacionais, sinais vitais, informações obstétricas, observações e encaminhamentos registrados.",
        createdAt: "2026-09-12T17:09:00",
      },
    ],
  },

  {
    id: "conversation-3",
    title: "Organização do prontuário",
    updatedAt: "2026-09-11T15:25:00",
    messages: [
      {
        id: "message-5",
        role: "USER",
        content:
          "Me ajude a organizar as informações do prontuário.",
        createdAt: "2026-09-11T15:20:00",
      },
    ],
  },
]