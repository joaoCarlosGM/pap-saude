import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            className={[
              "h-10 w-full rounded-lg border bg-white text-sm text-slate-900 outline-none transition",
              "placeholder:text-slate-400",
              "focus:border-pink-400 focus:ring-2 focus:ring-pink-100",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
              icon ? "pl-10 pr-3" : "px-3",
              error
                ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                : "border-slate-300",
              className,
            ].join(" ")}
            {...props}
          />
        </div>

        {error ? (
          <p className="mt-1.5 text-xs text-red-600">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  },
)

Input.displayName = "Input"

export default Input