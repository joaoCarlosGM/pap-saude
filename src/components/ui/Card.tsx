import type { HTMLAttributes, ReactNode } from "react"

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  )
}

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function CardHeader({
  children,
  className = "",
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={[
        "border-b border-slate-100 px-4 py-4 sm:px-5 lg:px-6",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  )
}

type CardContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function CardContent({
  children,
  className = "",
  ...props
}: CardContentProps) {
  return (
    <div
      className={[
        "p-4 sm:p-5 lg:p-6",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  )
}

type CardFooterProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function CardFooter({
  children,
  className = "",
  ...props
}: CardFooterProps) {
  return (
    <div
      className={[
        "flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5 lg:px-6",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  )
}