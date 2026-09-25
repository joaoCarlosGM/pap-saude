"use client"

import {
  Bot,
  ClipboardList,
  FileText,
  HeartPulse,
} from "lucide-react"

type Props = {
  onSuggestion: (
    message: string,
  ) => void
}

const suggestions = [
  {
    icon: ClipboardList,
    title:
      "Resumir atendimento",
    prompt:
      "Ajude a organizar um atendimento em um resumo clínico.",
  },

  {
    icon: FileText,
    title:
      "Organizar prontuário",
    prompt:
      "Ajude a organizar as informações de um prontuário.",
  },

  {
    icon: HeartPulse,
    title:
      "Revisar dados",
    prompt:
      "Ajude a revisar os dados registrados de uma paciente.",
  },
]

export default function ChatEmptyState({
  onSuggestion,
}: Props) {
  return (
    <div
      className="
        flex
        flex-1
        items-center
        justify-center
        overflow-y-auto
        px-4
        py-8
      "
    >
      <div className="w-full max-w-2xl text-center">
        <div
          className="
            mx-auto
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-pink-50
            text-pink-500
          "
        >
          <Bot size={26} />
        </div>

        <h2
          className="
            mt-4
            text-xl
            font-semibold
            text-slate-900
          "
        >
          Como posso ajudar?
        </h2>

        <p
          className="
            mx-auto
            mt-2
            max-w-lg
            text-sm
            leading-6
            text-slate-500
          "
        >
          Use a IA do PAP Saúde
          para organizar informações,
          resumir registros e apoiar
          a consulta aos dados do
          sistema.
        </p>

        <div
          className="
            mt-6
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-3
          "
        >
          {suggestions.map(
            (suggestion) => {
              const Icon =
                suggestion.icon

              return (
                <button
                  key={
                    suggestion.title
                  }
                  type="button"
                  onClick={() =>
                    onSuggestion(
                      suggestion.prompt,
                    )
                  }
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    text-left
                    transition
                    hover:border-pink-200
                    hover:bg-pink-50/30
                    hover:shadow-sm
                  "
                >
                  <Icon
                    size={18}
                    className="text-pink-500"
                  />

                  <p
                    className="
                      mt-3
                      text-sm
                      font-semibold
                      text-slate-800
                    "
                  >
                    {
                      suggestion.title
                    }
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-slate-400
                    "
                  >
                    Usar esta sugestão
                  </p>
                </button>
              )
            },
          )}
        </div>
      </div>
    </div>
  )
}