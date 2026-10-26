import { notFound } from "next/navigation";
import { requireCommercialPageSession } from "@/server/demo/commercial-page-session";
import { demoContent } from "@/server/demo/fixtures";
import { isDemoSection } from "@/lib/demo/types";
import DemoExplorer from "@/components/demo/DemoExplorer";
import ClinicalDashboardView from "@/components/dashboard/ClinicalDashboardView";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireCommercialPageSession();
    const { section } = await params;
    if (!isDemoSection(section) || Object.keys(await searchParams).length)
        notFound();
    const data = demoContent(section);
    return section === "dashboard" ? <ClinicalDashboardView data={data.dashboard} demo/> : <DemoExplorer key={section} data={data}/>;
}
