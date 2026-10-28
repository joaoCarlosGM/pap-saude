import AttendanceChart from "./AttendanceChart";
import DashboardKpi from "./DashboardKpi";
import QuickActions from "./QuickActions";
import RecentAttendances from "./RecentAttendances";
import RiskDistribution from "./RiskDistribution";
import UpcomingDeliveries from "./UpcomingDeliveries";
import CourseRecommendations from "./CourseRecommendations";
import type { DashboardData } from "@/lib/demo/types";
export default function ClinicalDashboardView({ data, demo = false }: {
    data: DashboardData;
    demo?: boolean;
}) {
    return <div className="mx-auto w-full max-w-[1600px] clinical-dashboard-view">
    <header className="mb-6"><h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{demo ? "Dashboard demonstrativo" : "Dashboard"}</h1><p className="mt-1 text-sm text-slate-600">{demo ? "Uma visão fictícia do acompanhamento, para apresentar a experiência PAP Saúde." : "Dados operacionais das UBS autorizadas na sua sessão. Contagens por ocorrência em UTC; sem classificação automática de risco."}</p></header>
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.kpis.map(kpi => <DashboardKpi key={kpi.id} kpi={kpi}/>)}</section>
    <div className="mt-6"><QuickActions demo={demo}/></div>
    <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">{data.monthly.some(m=>m.total>0)?<AttendanceChart data={data.monthly} comparisonLabel={demo ? "Exemplo visual" : "Sem comparação histórica"}/>:<div className="rounded-xl border bg-white p-5">Sem dados de atendimentos concluídos nos últimos seis meses.</div>}{demo?<RiskDistribution data={data.risks}/>:<div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Classificação de risco</h2><p>Indisponível. MEOWS permanece DRAFT_UNVALIDATED / POLICY_UNRESOLVED e não gera decisões clínicas.</p></div>}</section>
    <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"><RecentAttendances data={data.recent} demo={demo}/>{data.deliveries.length?<UpcomingDeliveries data={data.deliveries}/>:<div className="rounded-xl border bg-white p-5">Sem dados de DPP disponíveis nesta visão.</div>}</section>
    {demo && <CourseRecommendations demo/>}
  </div>;
}
