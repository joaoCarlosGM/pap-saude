"use client"

import {useEffect,useRef,useId,type ReactNode} from "react"
import { X } from "lucide-react"

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl"
}

const widthClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "lg",
}: ModalProps) {
  const dialog=useRef<HTMLDivElement>(null), titleId=useId()
  useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const el=dialog.current;el?.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')?.focus();return()=>previous?.focus()},[open])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />

      <div className="relative flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <div
          ref={dialog}
          aria-labelledby={title?titleId:undefined}
          aria-label={title?undefined:'Janela demonstrativa'}
          onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}if(e.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')||[]).filter(el=>el.getClientRects().length>0);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}}
          role="dialog"
          aria-modal="true"
          className={[
            "relative z-10 flex max-h-[95dvh] w-full flex-col bg-white shadow-xl",
            "rounded-t-2xl",
            "sm:max-h-[90vh] sm:rounded-xl",
            widthClasses[maxWidth],
          ].join(" ")}
        >
          {(title || description) && (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                {title && (
                  <h2 id={titleId} className="text-base font-semibold text-slate-900 sm:text-lg">
                    {title}
                  </h2>
                )}

                {description && (
                  <p className="mt-1 text-sm text-slate-500">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </div>

          {footer && (
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:px-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}