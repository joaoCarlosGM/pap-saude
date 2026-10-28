import {requireClinicalPageSession} from "@/server/clinical/clinical-page-session";
import ClinicalModuleNotice from "@/components/workspace/ClinicalModuleNotice";
export default async function Page(){await requireClinicalPageSession();return <ClinicalModuleNotice title="Chat IA" description="Não há serviço de IA clínica conectado ou homologado. Nenhuma pergunta ou prontuário é enviado a modelos externos." ai/>;}
