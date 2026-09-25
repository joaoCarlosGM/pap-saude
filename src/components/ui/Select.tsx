import {
  forwardRef,
  type SelectHTMLAttributes,
} from "react"

type SelectProps =
  SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string
    error?: string
    helperText?: string
  }

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      className = "",
      id,
      children,
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

        <select
          ref={ref}
          id={id}
          className={[
            "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition",
            "focus:border-pink-400 focus:ring-2 focus:ring-pink-100",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
              : "border-slate-300",
            className,
          ].join(" ")}
          {...props}
        >
          {children}
        </select>

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

Select.displayName = "Select"

export default Select