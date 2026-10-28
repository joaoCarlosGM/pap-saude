import {requireClinicalPageSession} from "@/server/clinical/clinical-page-session";
import ClinicalModuleNotice from "@/components/workspace/ClinicalModuleNotice";
export default async function Page(){await requireClinicalPageSession();return <ClinicalModuleNotice title="Cursos" description="Não há catálogo de capacitação operacional conectado." />;}
