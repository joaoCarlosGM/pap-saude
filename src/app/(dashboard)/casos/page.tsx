import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
export default async function CasosPage() {
  await requireClinicalPageSession();
  return <h1 className="text-2xl font-semibold">Casos</h1>
}
