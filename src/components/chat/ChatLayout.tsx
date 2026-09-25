"use client"

import {
  useState,
} from "react"

import ChatComposer from "./ChatComposer"
import ChatHeader from "./ChatHeader"
import ChatMessages from "./ChatMessages"
import ChatSidebar from "./ChatSidebar"

import type {
  ChatConversation,
  ChatMessage,
} from "@/types/chat"

type Props = {
  initialConversations:
    ChatConversation[]
}

function createId() {
  return crypto.randomUUID()
}

export default function ChatLayout({
  initialConversations,
}: Props) {
  const [
    conversations,
    setConversations,
  ] = useState(
    initialConversations,
  )

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(
    initialConversations[0]?.id ??
      null,
  )

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false)

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        selectedId,
    ) ?? null

  function handleNewConversation() {
    const id = createId()

    const conversation:
      ChatConversation = {
        id,
        title: "Nova conversa",
        updatedAt:
          new Date().toISOString(),
        messages: [],
      }

    setConversations(
      (current) => [
        conversation,
        ...current,
      ],
    )

    setSelectedId(id)
  }

  function sendMessage(
    content: string,
  ) {
    if (!selectedId) {
      return
    }

    const userMessage:
      ChatMessage = {
        id: createId(),
        role: "USER",
        content,
        createdAt:
          new Date().toISOString(),
      }

    setConversations(
      (current) =>
        current.map(
          (conversation) => {
            if (
              conversation.id !==
              selectedId
            ) {
              return conversation
            }

            const firstMessage =
              conversation.messages
                .length === 0

            return {
              ...conversation,

              title:
                firstMessage
                  ? content
                      .slice(
                        0,
                        42,
                      )
                  : conversation.title,

              updatedAt:
                new Date().toISOString(),

              messages: [
                ...conversation.messages,
                userMessage,
              ],
            }
          },
        ),
    )

    window.setTimeout(
      () => {
        const assistantMessage:
          ChatMessage = {
            id: createId(),

            role:
              "ASSISTANT",

            content:
              "Esta é uma resposta simulada do assistente do PAP Saúde. Na camada de integração, esta mensagem será substituída pela resposta da API de IA.",

            createdAt:
              new Date().toISOString(),
          }

        setConversations(
          (current) =>
            current.map(
              (
                conversation,
              ) => {
                if (
                  conversation.id !==
                  selectedId
                ) {
                  return conversation
                }

                return {
                  ...conversation,

                  updatedAt:
                    new Date().toISOString(),

                  messages: [
                    ...conversation.messages,
                    assistantMessage,
                  ],
                }
              },
            ),
        )
      },
      600,
    )
  }

  function handleSuggestion(
    content: string,
  ) {
    sendMessage(content)
  }

  return (
    <div
      className="
        -m-4
        flex
        h-[calc(100dvh-64px)]
        overflow-hidden
        bg-slate-50
        sm:-m-5
        lg:-m-6
      "
    >
      <ChatSidebar
        conversations={
          conversations
        }
        selectedId={
          selectedId
        }
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        onSelect={
          setSelectedId
        }
        onNewConversation={
          handleNewConversation
        }
      />

      <section
        className="
          flex
          min-w-0
          flex-1
          flex-col
          bg-slate-50
        "
      >
        <ChatHeader
          title={
            selectedConversation
              ?.title ??
            "Nova conversa"
          }
          onOpenSidebar={() =>
            setSidebarOpen(true)
          }
        />

        {selectedConversation ? (
          <>
            <ChatMessages
              messages={
                selectedConversation.messages
              }
              onSuggestion={
                handleSuggestion
              }
            />

            <ChatComposer
              onSend={
                sendMessage
              }
            />
          </>
        ) : (
          <div
            className="
              flex
              flex-1
              items-center
              justify-center
              p-6
              text-center
            "
          >
            <div>
              <p className="text-sm font-medium text-slate-600">
                Nenhuma conversa
                selecionada
              </p>

              <button
                type="button"
                onClick={
                  handleNewConversation
                }
                className="
                  mt-3
                  text-sm
                  font-medium
                  text-pink-600
                  hover:text-pink-700
                "
              >
                Criar nova conversa
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}