"use client"

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

export default function SettingSwitch({
  checked,
  onChange,
  label,
  description,
}: Props) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-4
        border-b
        border-slate-100
        py-4
        last:border-b-0
      "
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {label}
        </p>

        {description && (
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked
            ? "bg-pink-500"
            : "bg-slate-200",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked
              ? "translate-x-6"
              : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  )
}