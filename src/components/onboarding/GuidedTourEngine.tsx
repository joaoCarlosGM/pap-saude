"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import type {
  GuidedTourStep,
  OnboardingProgress,
} from "@/lib/onboarding/types"

type TargetRect = {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

type GuidedTourEngineProps = {
  tourKey: string
  tourVersion: number
  steps: GuidedTourStep[]
  permissions: string[]
}

export default function GuidedTourEngine({
  tourKey,
  tourVersion,
  steps,
  permissions,
}: GuidedTourEngineProps) {
  const [
    open,
    setOpen,
  ] =
    useState(false)

  const [
    currentStep,
    setCurrentStep,
  ] =
    useState(0)

  const [
    targetRect,
    setTargetRect,
  ] =
    useState<
      TargetRect | null
    >(null)

  const allowedPermissions =
    useMemo(
      () =>
        new Set(
          permissions,
        ),
      [
        permissions,
      ],
    )

  const visibleSteps =
    useMemo(
      () =>
        steps.filter(
          (
            step,
          ) =>
            !step.requiredAny ||
            step.requiredAny.some(
              (
                permission,
              ) =>
                allowedPermissions.has(
                  permission,
                ),
            ),
        ),
      [
        steps,
        allowedPermissions,
      ],
    )

  const persist =
    useCallback(
      async (
        status:
          | "STARTED"
          | "COMPLETED"
          | "SKIPPED",
        step:
          number,
      ) => {
        await fetch(
          `/api/onboarding/${encodeURIComponent(tourKey)}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                version:
                  tourVersion,
                status,
                currentStep:
                  step,
              }),
          },
        )
      },
      [
        tourKey,
        tourVersion,
      ],
    )

  useEffect(
    () => {
      if (
        visibleSteps.length ===
        0
      ) {
        return
      }

      const controller =
        new AbortController()

      void fetch(
        `/api/onboarding/${encodeURIComponent(tourKey)}?version=${tourVersion}`,
        {
          cache:
            "no-store",

          signal:
            controller.signal,
        },
      )
        .then(
          async (
            response,
          ) => {
            if (
              !response.ok
            ) {
              throw new Error()
            }

            return response.json() as Promise<{
              progress:
                OnboardingProgress | null
            }>
          },
        )
        .then(
          (
            data,
          ) => {
            const progress =
              data.progress

            if (
              !progress
            ) {
              setCurrentStep(
                0,
              )
              setOpen(
                true,
              )

              void persist(
                "STARTED",
                0,
              )

              return
            }

            if (
              progress.status !==
              "STARTED"
            ) {
              return
            }

            const resumedStep =
              Math.min(
                progress.currentStep,
                visibleSteps.length -
                  1,
              )

            setCurrentStep(
              resumedStep,
            )

            setOpen(
              true,
            )
          },
        )
        .catch(
          () => {},
        )

      return () => {
        controller.abort()
      }
    },
    [
      persist,
      tourKey,
      tourVersion,
      visibleSteps.length,
    ],
  )

  useEffect(
    () => {
      const restart = (
        event: Event,
      ) => {
        const custom =
          event as CustomEvent<{
            tourKey?: string
          }>

        if (
          custom.detail
            ?.tourKey !==
          tourKey
        ) {
          return
        }

        setCurrentStep(
          0,
        )

        setOpen(
          true,
        )

        void persist(
          "STARTED",
          0,
        )
      }

      window.addEventListener(
        "pap-tour:restart",
        restart,
      )

      return () => {
        window.removeEventListener(
          "pap-tour:restart",
          restart,
        )
      }
    },
    [
      persist,
      tourKey,
    ],
  )

  useEffect(
    () => {
      if (
        !open ||
        !visibleSteps[
          currentStep
        ]
      ) {
        return
      }

      let frame = 0

      const update =
        () => {
          window.cancelAnimationFrame(
            frame,
          )

          frame =
            window.requestAnimationFrame(
              () => {
                const target =
                  document.querySelector(
                    visibleSteps[
                      currentStep
                    ].target,
                  )

                if (
                  !(target instanceof
                    HTMLElement)
                ) {
                  setTargetRect(
                    null,
                  )
                  return
                }

                const rect =
                  target.getBoundingClientRect()

                setTargetRect({
                  top:
                    rect.top,
                  left:
                    rect.left,
                  right:
                    rect.right,
                  bottom:
                    rect.bottom,
                  width:
                    rect.width,
                  height:
                    rect.height,
                })
              },
            )
        }

      update()

      window.addEventListener(
        "resize",
        update,
      )

      window.addEventListener(
        "scroll",
        update,
        true,
      )

      return () => {
        window.cancelAnimationFrame(
          frame,
        )

        window.removeEventListener(
          "resize",
          update,
        )

        window.removeEventListener(
          "scroll",
          update,
          true,
        )
      }
    },
    [
      open,
      currentStep,
      visibleSteps,
    ],
  )

  if (
    !open ||
    visibleSteps.length ===
      0
  ) {
    return null
  }

  const step =
    visibleSteps[
      currentStep
    ]

  const last =
    currentStep ===
    visibleSteps.length -
      1

  async function next() {
    if (last) {
      await persist(
        "COMPLETED",
        currentStep,
      )

      setOpen(
        false,
      )

      return
    }

    const nextStep =
      currentStep + 1

    setCurrentStep(
      nextStep,
    )

    await persist(
      "STARTED",
      nextStep,
    )
  }

  async function previous() {
    const previousStep =
      Math.max(
        0,
        currentStep - 1,
      )

    setCurrentStep(
      previousStep,
    )

    await persist(
      "STARTED",
      previousStep,
    )
  }

  async function skip() {
    await persist(
      "SKIPPED",
      currentStep,
    )

    setOpen(
      false,
    )
  }

  const tooltipTop =
    targetRect
      ? Math.min(
          window.innerHeight -
            250,
          Math.max(
            16,
            targetRect.bottom +
              14,
          ),
        )
      : 80

  const tooltipLeft =
    targetRect
      ? Math.min(
          window.innerWidth -
            360,
          Math.max(
            16,
            targetRect.left,
          ),
        )
      : 16

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {targetRect && (
        <div
          aria-hidden="true"
          className="fixed rounded-xl ring-2 ring-pink-400"
          style={{
            top:
              targetRect.top -
              5,
            left:
              targetRect.left -
              5,
            width:
              targetRect.width +
              10,
            height:
              targetRect.height +
              10,
            boxShadow:
              "0 0 0 9999px rgba(15, 23, 42, 0.58)",
          }}
        />
      )}

      {!targetRect && (
        <div className="fixed inset-0 bg-slate-950/60" />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          step.title
        }
        className="pointer-events-auto fixed w-[calc(100vw-32px)] max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        style={{
          top:
            tooltipTop,
          left:
            tooltipLeft,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
            {currentStep + 1}
            {" / "}
            {
              visibleSteps.length
            }
          </span>

          <button
            type="button"
            onClick={() =>
              void skip()
            }
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Pular tour
          </button>
        </div>

        <h2 className="mt-3 text-lg font-semibold text-slate-950">
          {step.title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {
            step.description
          }
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={
              currentStep ===
              0
            }
            onClick={() =>
              void previous()
            }
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={() =>
              void next()
            }
            className="rounded-lg bg-[#064f50] px-4 py-2 text-sm font-medium text-white"
          >
            {last
              ? "Concluir"
              : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  )
}
