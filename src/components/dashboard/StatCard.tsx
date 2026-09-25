import type { ReactNode } from "react"

type StatCardProps = {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
}

export default function StatCard({
  title,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}