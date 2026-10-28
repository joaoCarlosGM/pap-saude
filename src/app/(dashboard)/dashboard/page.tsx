import { cookies } from "next/headers";
import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import ClinicalDashboardView from "@/components/dashboard/ClinicalDashboardView";
import { clinicalDashboard } from "@/server/clinical-dashboard/clinical-dashboard.service";
import { SESSION_COOKIE_NAME } from "@/server/security/constants";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
 await requireClinicalPageSession();
 return <ClinicalDashboardView data={await clinicalDashboard((await cookies()).get(SESSION_COOKIE_NAME)?.value??"")}/>;
}
