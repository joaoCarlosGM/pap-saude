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

export default function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="mb-8 flex items-start">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const completed = stepNumber < currentStep
        const active = stepNumber === currentStep

        return (
          <div
            key={step}
            className="flex flex-1 items-start"
          >
            <div className="flex flex-1 flex-col items-center">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
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
                  "mt-2 text-center text-xs font-medium",
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
                  "mt-4 h-0.5 flex-1",
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
  )
}