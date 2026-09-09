type PacientePageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PacientePage({
  params,
}: PacientePageProps) {
  const { id } = await params

  return (
    <main>
      <h1 className="text-2xl font-semibold text-slate-900">
        Paciente
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        ID: {id}
      </p>
    </main>
  )
}