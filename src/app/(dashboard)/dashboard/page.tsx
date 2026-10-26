import { requireClinicalPageSession } from "@/server/clinical/clinical-page-session";
import ClinicalDashboardView from "@/components/dashboard/ClinicalDashboardView";
import { dashboardKpis, monthlyAttendances, recentAttendances, riskDistribution, upcomingDeliveries } from "@/lib/mock-dashboard";
export default async function DashboardPage() {
    await requireClinicalPageSession();
    return <ClinicalDashboardView data={{ kpis: dashboardKpis, monthly: monthlyAttendances, recent: recentAttendances, risks: riskDistribution, deliveries: upcomingDeliveries }}/>;
}
