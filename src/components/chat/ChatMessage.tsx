"use client"

import {
  Bot,
  User,
} from "lucide-react"

import type {
  ChatMessage as ChatMessageType,
} from "@/types/chat"

type Props = {
  message: ChatMessageType
}

function formatTime(
  date: string,
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(date))
}

export default function ChatMessage({
  message,
}: Props) {
  const isUser =
    message.role === "USER"

  return (
    <div
      className={[
        "flex w-full gap-3",
        isUser
          ? "justify-end"
          : "justify-start",
      ].join(" ")}
    >
      {!isUser && (
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-pink-50
            text-pink-500
          "
        >
          <Bot size={16} />
        </div>
      )}

      <div
        className={[
          "max-w-[85%] sm:max-w-[75%] lg:max-w-[68%]",
          isUser
            ? "items-end"
            : "items-start",
        ].join(" ")}
      >
        <div
          className={[
            "rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
            isUser
              ? "rounded-br-md bg-pink-500 text-white"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-700",
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        <p
          className={[
            "mt-1 px-1 text-[10px] text-slate-400",
            isUser
              ? "text-right"
              : "text-left",
          ].join(" ")}
        >
          {formatTime(
            message.createdAt,
          )}
        </p>
      </div>

      {isUser && (
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-slate-100
            text-slate-500
          "
        >
          <User size={16} />
        </div>
      )}
    </div>
  )
}