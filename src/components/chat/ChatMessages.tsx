"use client"

import {
  useEffect,
  useRef,
} from "react"

import ChatMessage from "./ChatMessage"
import ChatEmptyState from "./ChatEmptyState"

import type {
  ChatMessage as ChatMessageType,
} from "@/types/chat"

type Props = {
  messages: ChatMessageType[]
  onSuggestion: (
    message: string,
  ) => void
}

export default function ChatMessages({
  messages,
  onSuggestion,
}: Props) {
  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    )

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      },
    )
  }, [messages])

  if (messages.length === 0) {
    return (
      <ChatEmptyState
        onSuggestion={onSuggestion}
      />
    )
  }

  return (
    <div
      className="
        flex-1
        overflow-y-auto
        px-4
        py-5
        sm:px-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-4xl
          flex-col
          gap-5
        "
      >
        {messages.map(
          (message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ),
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}