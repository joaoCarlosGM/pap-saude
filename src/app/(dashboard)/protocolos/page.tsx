import ProtocolList from "@/components/protocolos/ProtocolList"

import { mockProtocolos } from "@/lib/mock-protocolos"

export default function ProtocolosPage() {
  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1600px]
      "
    >
      <header className="mb-6">
        <h1
          className="
            text-xl
            font-semibold
            text-slate-900
            sm:text-2xl
          "
        >
          Protocolos
        </h1>

        <p
          className="
            mt-1
            text-sm
            text-slate-500
          "
        >
          Protocolos clínicos da unidade
        </p>
      </header>

      <ProtocolList
        protocols={mockProtocolos}
      />
    </div>
  )
}