import {requireClinicalPageSession} from "@/server/clinical/clinical-page-session";
import ClinicalModuleNotice from "@/components/workspace/ClinicalModuleNotice";
export default async function Page(){await requireClinicalPageSession();return <ClinicalModuleNotice title="Ferramentas" description="Não há catálogo de ferramentas clínicas homologadas conectado." />;}
