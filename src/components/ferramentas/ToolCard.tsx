"use client"

import {
  CalendarDays,
  Calculator,
  HeartPulse,
  Pill,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import type {
  ClinicalTool,
  ClinicalToolIcon,
} from "@/types/ferramenta"

type ToolCardProps = {
  tool: ClinicalTool
  onOpen: (tool: ClinicalTool) => void
}

const iconMap = {
  calculator: Calculator,
  "heart-pulse": HeartPulse,
  pill: Pill,
  "trending-up": TrendingUp,
  "calendar-days": CalendarDays,
} satisfies Record<
  ClinicalToolIcon,
  React.ElementType
>

export default function ToolCard({
  tool,
  onOpen,
}: ToolCardProps) {
  const Icon = iconMap[tool.icon]

  const available =
    tool.status === "AVAILABLE"

  return (
    <article
      className={[
        "relative flex min-h-[210px] flex-col rounded-xl border bg-white p-5 shadow-sm transition sm:min-h-[218px]",
        available
          ? "border-slate-200 hover:border-pink-200 hover:shadow-md"
          : "border-slate-200 opacity-70",
      ].join(" ")}
    >
      {!available && (
        <span
          className="
            absolute
            right-5
            top-5
            text-xs
            font-medium
            text-slate-500
          "
        >
          Em breve
        </span>
      )}

      <div
        className={[
          "flex h-11 w-11 items-center justify-center rounded-full",
          available
            ? "bg-pink-50 text-pink-500"
            : "bg-slate-100 text-slate-400",
        ].join(" ")}
      >
        <Icon size={20} />
      </div>

      <div className="mt-4 flex-1">
        <h2
          className={[
            "text-base font-semibold",
            available
              ? "text-slate-900"
              : "text-slate-600",
          ].join(" ")}
        >
          {tool.title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {tool.description}
        </p>
      </div>

      {available && (
        <div className="mt-5">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpen(tool)}
            className="px-4"
          >
            Abrir
          </Button>
        </div>
      )}
    </article>
  )
}