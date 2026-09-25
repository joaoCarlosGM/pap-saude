"use client"

import {
  Download,
  FileText,
} from "lucide-react"

import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/button"

import type { Protocol } from "@/types/protocolo"

type ProtocolPreviewModalProps = {
  protocol: Protocol | null
  open: boolean
  onClose: () => void
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
  ).format(new Date(`${date}T12:00:00`))
}

export default function ProtocolPreviewModal({
  protocol,
  open,
  onClose,
}: ProtocolPreviewModalProps) {
  if (!protocol) {
    return null
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={protocol.title}
      description="Visualização do protocolo"
      maxWidth="lg"
      footer={
        <div
          className="
            flex
            w-full
            flex-col-reverse
            gap-2
            sm:flex-row
            sm:justify-end
          "
        >
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Fechar
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
          >
            <Download size={16} />

            Baixar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div
          className="
            flex
            items-start
            gap-4
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            p-4
          "
        >
          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-pink-50
              text-pink-500
            "
          >
            <FileText size={20} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {protocol.fileName}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Upload em{" "}
              {formatDate(
                protocol.uploadDate,
              )}
            </p>
          </div>
        </div>

        <div
          className="
            flex
            min-h-[280px]
            items-center
            justify-center
            rounded-xl
            border
            border-dashed
            border-slate-200
            bg-slate-50
            px-6
            text-center
          "
        >
          <div>
            <FileText
              size={34}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Pré-visualização do documento
            </p>

            <p
              className="
                mx-auto
                mt-1
                max-w-sm
                text-xs
                leading-5
                text-slate-400
              "
            >
              O conteúdo real do PDF será
              exibido aqui quando conectarmos
              o armazenamento de protocolos.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}