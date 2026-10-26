import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import ClinicalPatientList from "@/components/clinical/ClinicalPatientList";

export default async function PacientesPage() {
  await requireClinicalPageSession();
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Pacientes
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Gestantes acompanhadas na unidade ativa
        </p>
      </header>

      <ClinicalPatientList />
    </div>
  );
}
