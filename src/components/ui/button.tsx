import * as React from "react"
import {
  cva,
  type VariantProps,
} from "class-variance-authority"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-colors outline-none",
    "focus-visible:ring-2 focus-visible:ring-pink-200",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-pink-500 text-white hover:bg-pink-600",

        outline:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",

        secondary:
          "bg-slate-100 text-slate-700 hover:bg-slate-200",

        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",

        destructive:
          "bg-red-600 text-white hover:bg-red-700",

        link:
          "text-pink-600 underline-offset-4 hover:underline",
      },

      size: {
        default:
          "h-10 px-4",

        sm:
          "h-9 px-3 text-sm",

        lg:
          "h-11 px-5",

        icon:
          "h-10 w-10 p-0",

        "icon-sm":
          "h-9 w-9 p-0",

        "icon-lg":
          "h-11 w-11 p-0",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

type ButtonProps =
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }

function Button({
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({
        variant,
        size,
        className,
      })}
      {...props}
    />
  )
}

export {
  Button,
  buttonVariants,
}