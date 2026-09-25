"use client"

import { useState } from "react"

import ToolCard from "./ToolCard"
import GestationalCalculatorModal from "./GestationalCalculatorModal"

import type { ClinicalTool } from "@/types/ferramenta"

type ToolsGridProps = {
  tools: ClinicalTool[]
}

export default function ToolsGrid({
  tools,
}: ToolsGridProps) {
  const [
    gestationalCalculatorOpen,
    setGestationalCalculatorOpen,
  ] = useState(false)

  function handleOpen(
    tool: ClinicalTool,
  ) {
    if (
      tool.id ===
      "gestational-calculator"
    ) {
      setGestationalCalculatorOpen(
        true,
      )
    }
  }

  return (
    <>
      <div
        className="
          grid
          grid-cols-1
          gap-4
          md:grid-cols-2
          xl:grid-cols-3
        "
      >
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onOpen={handleOpen}
          />
        ))}
      </div>

      <GestationalCalculatorModal
        open={
          gestationalCalculatorOpen
        }
        onClose={() =>
          setGestationalCalculatorOpen(
            false,
          )
        }
      />
    </>
  )
}