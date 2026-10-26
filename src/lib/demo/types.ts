import type { DashboardKpi, MonthlyAttendance, RiskDistributionItem, DashboardAttendance, UpcomingDelivery } from "@/types/dashboard";
import type { Course } from "@/types/curso";
import type { Protocol } from "@/types/protocolo";
import type { ClinicalTool } from "@/types/ferramenta";
export const DEMO_SECTIONS = ["dashboard", "pacientes", "atendimentos", "registro", "protocolos", "ferramentas", "cursos", "chat", "ajuda"] as const;
export type DemoSection = typeof DEMO_SECTIONS[number];
export type DemoPatient = {
    id: string;
    name: string;
    age: number;
    gestationalAge: string;
    note: string;
};
export type DashboardData = {
    kpis: DashboardKpi[];
    monthly: MonthlyAttendance[];
    risks: RiskDistributionItem[];
    recent: DashboardAttendance[];
    deliveries: UpcomingDelivery[];
};
export type DemoContent = {
    mode: "DEMO";
    scope: "SYNTHETIC";
    section: DemoSection;
    patients: DemoPatient[];
    dashboard: DashboardData;
    courses: Course[];
    protocols: Protocol[];
    tools: ClinicalTool[];
};
export function isDemoSection(value: string): value is DemoSection {
    return (DEMO_SECTIONS as readonly string[]).includes(value);
}
