"use client"

import {
  Bot,
  MessageSquare,
  Plus,
  X,
} from "lucide-react"

import type {
  ChatConversation,
} from "@/types/chat"

type Props = {
  conversations:
    ChatConversation[]
  selectedId: string | null
  open: boolean
  onClose: () => void
  onSelect: (
    id: string,
  ) => void
  onNewConversation:
    () => void
}

function formatDate(
  date: string,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
    },
  ).format(new Date(date))
}

export default function ChatSidebar({
  conversations,
  selectedId,
  open,
  onClose,
  onSelect,
  onNewConversation,
}: Props) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar conversas"
          onClick={onClose}
          className="
            fixed
            inset-0
            z-40
            bg-black/30
            lg:hidden
          "
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-[260px] lg:translate-x-0",
          open
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        <div
          className="
            flex
            h-16
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-200
            px-4
          "
        >
          <div className="flex items-center gap-2">
            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                bg-pink-50
                text-pink-500
              "
            >
              <Bot size={17} />
            </div>

            <div>
              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Chat IA
              </p>

              <p className="text-[10px] text-slate-400">
                PAP Saúde
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-100
              lg:hidden
            "
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onNewConversation()
              onClose()
            }}
            className="
              flex
              h-10
              w-full
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-pink-500
              px-3
              text-sm
              font-medium
              text-white
              transition
              hover:bg-pink-600
            "
          >
            <Plus size={16} />
            Nova conversa
          </button>
        </div>

        <div
          className="
            flex-1
            overflow-y-auto
            px-2
            pb-3
          "
        >
          <p
            className="
              px-2
              py-2
              text-[10px]
              font-semibold
              uppercase
              tracking-wider
              text-slate-400
            "
          >
            Conversas
          </p>

          <div className="space-y-1">
            {conversations.map(
              (conversation) => {
                const active =
                  selectedId ===
                  conversation.id

                return (
                  <button
                    key={
                      conversation.id
                    }
                    type="button"
                    onClick={() => {
                      onSelect(
                        conversation.id,
                      )
                      onClose()
                    }}
                    className={[
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition",
                      active
                        ? "bg-pink-50 text-pink-700"
                        : "text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <MessageSquare
                      size={15}
                      className="mt-0.5 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className="
                          truncate
                          text-xs
                          font-medium
                        "
                      >
                        {
                          conversation.title
                        }
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          text-slate-400
                        "
                      >
                        {formatDate(
                          conversation.updatedAt,
                        )}
                      </p>
                    </div>
                  </button>
                )
              },
            )}
          </div>
        </div>
      </aside>
    </>
  )
}