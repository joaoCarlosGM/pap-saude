import RegistrationWizard from "@/components/registro/RegistrationWizard"

export default function RegistroPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Registro
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Iniciar novo atendimento
        </p>
      </header>

      <RegistrationWizard />
    </div>
  )
}