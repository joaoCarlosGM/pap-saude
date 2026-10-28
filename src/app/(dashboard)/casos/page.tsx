import {requireClinicalPageSession} from "@/server/clinical/clinical-page-session";
import ClinicalModuleNotice from "@/components/workspace/ClinicalModuleNotice";
export default async function Page(){await requireClinicalPageSession();return <ClinicalModuleNotice title="Casos" description="O módulo de casos não está disponível para uso operacional." />;}
