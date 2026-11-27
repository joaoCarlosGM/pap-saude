import RegistrationWizard from '@/features/vitrine-premium/components/registro/RegistrationWizard'

export default function RegistroPage() {
  const heading = <header>
    <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Registro</h1>
    <p className="mt-1 text-sm text-slate-500">Iniciar novo atendimento</p>
  </header>
  return <div className="mx-auto w-full max-w-6xl"><RegistrationWizard heading={heading}/></div>
}
