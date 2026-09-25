"use client"

import {
  Menu,
  MoreHorizontal,
} from "lucide-react"

type Props = {
  title: string
  onOpenSidebar: () => void
}

export default function ChatHeader({
  title,
  onOpenSidebar,
}: Props) {
  return (
    <header
      className="
        flex
        h-16
        shrink-0
        items-center
        justify-between
        border-b
        border-slate-200
        bg-white
        px-4
        sm:px-6
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-slate-500
            transition
            hover:bg-slate-100
            lg:hidden
          "
          aria-label="Abrir conversas"
        >
          <Menu size={19} />
        </button>

        <div className="min-w-0">
          <h2
            className="
              truncate
              text-sm
              font-semibold
              text-slate-900
            "
          >
            {title}
          </h2>

          <p className="text-xs text-slate-400">
            Assistente PAP Saúde
          </p>
        </div>
      </div>

      <button
        type="button"
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-lg
          text-slate-400
          transition
          hover:bg-slate-100
          hover:text-slate-600
        "
      >
        <MoreHorizontal size={19} />
      </button>
    </header>
  )
}