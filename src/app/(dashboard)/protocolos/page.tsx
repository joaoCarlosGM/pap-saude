import {requireClinicalPageSession} from "@/server/clinical/clinical-page-session";
import ClinicalModuleNotice from "@/components/workspace/ClinicalModuleNotice";
export default async function Page(){await requireClinicalPageSession();return <ClinicalModuleNotice title="Protocolos" description="Não há repositório institucional de protocolos homologados conectado." />;}
