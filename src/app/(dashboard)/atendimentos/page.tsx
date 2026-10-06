import ClinicalEncounterList from "@/components/clinical/ClinicalEncounterList";

export default function AtendimentosPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Atendimentos
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Histórico real de registros clínicos da unidade
        </p>
      </header>

      <ClinicalEncounterList />
    </div>
  );
}
