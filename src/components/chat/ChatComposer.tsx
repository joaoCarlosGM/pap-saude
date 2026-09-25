"use client"

import {
  FormEvent,
  KeyboardEvent,
  useState,
} from "react"

import {
  Send,
} from "lucide-react"

type Props = {
  onSend: (
    content: string,
  ) => void
}

export default function ChatComposer({
  onSend,
}: Props) {
  const [message, setMessage] =
    useState("")

  function sendMessage() {
    const content =
      message.trim()

    if (!content) {
      return
    }

    onSend(content)
    setMessage("")
  }

  function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    sendMessage()
  }

  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault()

      sendMessage()
    }
  }

  return (
    <div
      className="
        shrink-0
        border-t
        border-slate-200
        bg-white
        px-3
        py-3
        sm:px-6
        sm:py-4
      "
    >
      <form
        onSubmit={handleSubmit}
        className="
          mx-auto
          flex
          w-full
          max-w-4xl
          items-end
          gap-2
        "
      >
        <div
          className="
            flex
            min-h-11
            flex-1
            items-end
            rounded-xl
            border
            border-slate-200
            bg-white
            px-3
            py-2
            shadow-sm
            transition
            focus-within:border-pink-300
            focus-within:ring-2
            focus-within:ring-pink-100
          "
        >
          <textarea
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value,
              )
            }
            onKeyDown={
              handleKeyDown
            }
            rows={1}
            placeholder="Digite sua mensagem..."
            className="
              max-h-32
              min-h-6
              w-full
              resize-none
              bg-transparent
              text-sm
              leading-6
              text-slate-700
              outline-none
              placeholder:text-slate-400
            "
          />
        </div>

        <button
          type="submit"
          disabled={
            !message.trim()
          }
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-pink-500
            text-white
            transition
            hover:bg-pink-600
            disabled:cursor-not-allowed
            disabled:bg-slate-200
            disabled:text-slate-400
          "
          aria-label="Enviar mensagem"
        >
          <Send size={18} />
        </button>
      </form>

      <p
        className="
          mx-auto
          mt-2
          max-w-4xl
          text-center
          text-[10px]
          text-slate-400
        "
      >
        A IA pode cometer erros.
        Confirme informações clínicas
        nos protocolos oficiais.
      </p>
    </div>
  )
}