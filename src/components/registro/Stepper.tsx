import { Check } from "lucide-react"

const steps = [
  "Identificação",
  "Gestação",
  "Sinais Vitais",
  "Dados Obstétricos",
  "Resultado",
]

type StepperProps = {
  currentStep: number
}

export default function Stepper({
  currentStep,
}: StepperProps) {
  const currentLabel = steps[currentStep - 1]
  const progress = (currentStep / steps.length) * 100

  return (
    <div className="mb-6 sm:mb-8">
      {/* MOBILE */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Etapa {currentStep} de {steps.length}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {currentLabel}
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-500 text-sm font-semibold text-white">
            {currentStep}
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-pink-500 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {/* TABLET / DESKTOP */}
      <div className="hidden items-start sm:flex">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const completed = stepNumber < currentStep
          const active = stepNumber === currentStep

          return (
            <div
              key={step}
              className="flex flex-1 items-start"
            >
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    completed || active
                      ? "bg-pink-500 text-white"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {completed ? (
                    <Check size={18} />
                  ) : (
                    stepNumber
                  )}
                </div>

                <span
                  className={[
                    "mt-2 max-w-28 text-center text-xs font-medium",
                    active || completed
                      ? "text-pink-500"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  {step}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={[
                    "mt-4 h-0.5 min-w-4 flex-1",
                    stepNumber < currentStep
                      ? "bg-pink-500"
                      : "bg-slate-200",
                  ].join(" ")}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}