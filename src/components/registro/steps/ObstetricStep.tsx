"use client"

type ObstetricStepProps = {
  onNext: () => void
  onBack: () => void
}

export default function ObstetricStep({
  onNext,
  onBack,
}: ObstetricStepProps) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          Dados Obstétricos e Clínicos
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Preencha os dados obstétricos e clínicos da paciente. Os campos são
          opcionais.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="uterine-height"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Altura Uterina
          </label>

          <div className="relative">
            <input
              id="uterine-height"
              type="number"
              placeholder="Ex.: 28"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              cm
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="fetal-heart-rate"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            BCF
          </label>

          <div className="relative">
            <input
              id="fetal-heart-rate"
              type="number"
              placeholder="Ex.: 140"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              bpm
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="fetal-movement"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Movimentação Fetal
          </label>

          <select
            id="fetal-movement"
            defaultValue=""
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="presente">Presente</option>
            <option value="reduzida">Reduzida</option>
            <option value="ausente">Ausente</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="edema"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Edema
          </label>

          <select
            id="edema"
            defaultValue=""
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="ausente">Ausente</option>
            <option value="leve">Leve</option>
            <option value="moderado">Moderado</option>
            <option value="grave">Grave</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="vaginal-bleeding"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Sangramento Vaginal
          </label>

          <select
            id="vaginal-bleeding"
            defaultValue=""
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="ausente">Ausente</option>
            <option value="leve">Leve</option>
            <option value="moderado">Moderado</option>
            <option value="intenso">Intenso</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="current-weight"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Peso Atual
          </label>

          <div className="relative">
            <input
              id="current-weight"
              type="number"
              step="0.1"
              placeholder="Ex.: 68.5"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              kg
            </span>
          </div>
        </div>
      </div>

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs font-semibold tracking-wide text-slate-400">
          DADOS CLÍNICOS
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="main-complaints"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Queixas Principais
          </label>

          <textarea
            id="main-complaints"
            rows={4}
            placeholder="Descreva as principais queixas da paciente..."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          />
        </div>

        <div>
          <label
            htmlFor="professional-notes"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Observações do Profissional
          </label>

          <textarea
            id="professional-notes"
            rows={4}
            placeholder="Registre observações relevantes sobre o atendimento..."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
          />
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          ← Voltar
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          Ver Resultado →
        </button>
      </div>
    </div>
  )
}