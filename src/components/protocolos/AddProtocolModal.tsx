"use client"

import {
  FileUp,
  Upload,
} from "lucide-react"

import Modal from "@/components/ui/Modal"
import Input from "@/components/ui/Input"
import { Button } from "@/components/ui/button"

type AddProtocolModalProps = {
  open: boolean
  onClose: () => void
}

export default function AddProtocolModal({
  open,
  onClose,
}: AddProtocolModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar Protocolo"
      description="Adicione um novo protocolo clínico à unidade."
      maxWidth="md"
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
            Cancelar
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
          >
            <Upload size={16} />

            Adicionar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Input
          id="protocol-title"
          label="Título do protocolo"
          placeholder="Ex.: Protocolo de Pré-eclâmpsia"
        />

        <div>
          <label
            htmlFor="protocol-description"
            className="
              mb-1.5
              block
              text-sm
              font-medium
              text-slate-700
            "
          >
            Descrição
          </label>

          <textarea
            id="protocol-description"
            rows={4}
            placeholder="Breve descrição do protocolo..."
            className="
              w-full
              resize-none
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              py-2.5
              text-sm
              text-slate-700
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-pink-300
              focus:ring-2
              focus:ring-pink-100
            "
          />
        </div>

        <div>
          <p
            className="
              mb-1.5
              text-sm
              font-medium
              text-slate-700
            "
          >
            Documento
          </p>

          <label
            htmlFor="protocol-file"
            className="
              flex
              min-h-36
              cursor-pointer
              flex-col
              items-center
              justify-center
              rounded-xl
              border
              border-dashed
              border-slate-300
              bg-slate-50
              px-6
              text-center
              transition
              hover:border-pink-300
              hover:bg-pink-50/30
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-pink-50
                text-pink-500
              "
            >
              <FileUp size={19} />
            </div>

            <p
              className="
                mt-3
                text-sm
                font-medium
                text-slate-700
              "
            >
              Selecione um arquivo
            </p>

            <p className="mt-1 text-xs text-slate-400">
              PDF
            </p>

            <input
              id="protocol-file"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
            />
          </label>
        </div>
      </div>
    </Modal>
  )
}