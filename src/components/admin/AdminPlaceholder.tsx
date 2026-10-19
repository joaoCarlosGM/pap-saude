type AdminPlaceholderProps = {
  eyebrow: string
  title: string
  description: string
}

export default function AdminPlaceholder({
  eyebrow,
  title,
  description,
}: AdminPlaceholderProps) {
  return (
    <section className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
        {eyebrow}
      </p>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
        {title}
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
        {description}
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <p className="text-sm font-medium text-slate-700">
          Estrutura preparada para o próximo slice da F04.
        </p>
      </div>
    </section>
  )
}
