import RegistrationWizard from "@/components/registro/RegistrationWizard"

export default function RegistroPage() {
  return (
    <div className="w-full">
      <div className="mx-auto mb-6 w-full max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          Registro
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Iniciar novo atendimento
        </p>
      </div>

      <RegistrationWizard />
    </div>
  )
}