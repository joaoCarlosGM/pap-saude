import ToolsGrid from "@/components/ferramentas/ToolsGrid"

import { clinicalTools } from "@/lib/mock-ferramentas"

export default function FerramentasPage() {
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
          Ferramentas
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Calculadoras e ferramentas clínicas
        </p>
      </header>

      <ToolsGrid tools={clinicalTools} />
    </div>
  )
}