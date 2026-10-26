import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import ClinicalPatientDetail from "@/components/clinical/ClinicalPatientDetail";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientPage({ params }: Props) {
  await requireClinicalPageSession();
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <ClinicalPatientDetail patientId={id} />
    </div>
  );
}
