"use client"

import {
  Download,
  Eye,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import type { Protocol } from "@/types/protocolo"

type ProtocolCardProps = {
  protocol: Protocol
  onPreview: (protocol: Protocol) => void
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
  ).format(new Date(`${date}T12:00:00`))
}

export default function ProtocolCard({
  protocol,
  onPreview,
}: ProtocolCardProps) {
  function handleDownload() {
    if (protocol.fileUrl) {
      window.open(
        protocol.fileUrl,
        "_blank",
        "noopener,noreferrer",
      )

      return
    }

    /*
     * Enquanto não existe backend/arquivo real,
     * mantemos a ação visual sem inventar um PDF.
     */
    console.log(
      `Download solicitado: ${protocol.fileName}`,
    )
  }

  return (
    <article
      className="
        flex
        min-h-[186px]
        flex-col
        rounded-xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        transition
        duration-200
        hover:border-slate-300
        hover:shadow-md
        sm:p-5
      "
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-pink-50
            text-pink-500
          "
        >
          <FileText size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className="
              text-sm
              font-semibold
              leading-5
              text-slate-900
              sm:text-[15px]
            "
          >
            {protocol.title}
          </h2>

          <p
            className="
              mt-1.5
              text-sm
              leading-5
              text-slate-600
            "
          >
            {protocol.description}
          </p>

          <p className="mt-3 text-xs text-slate-400">
            Upload em{" "}
            {formatDate(protocol.uploadDate)}
          </p>
        </div>
      </div>

      <div
        className="
          mt-5
          flex
          flex-wrap
          items-center
          gap-2
        "
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onPreview(protocol)
          }
          className="
            border-slate-200
            bg-white
            text-slate-700
            hover:bg-slate-50
          "
        >
          <Eye size={15} />

          Visualizar
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="text-slate-600"
        >
          <Download size={15} />

          Baixar
        </Button>
      </div>
    </article>
  )
}