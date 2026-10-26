import { notFound } from "next/navigation";
import { requireCommercialPageSession } from "@/server/demo/commercial-page-session";
import { demoContent } from "@/server/demo/fixtures";
import ClinicalDashboardView from "@/components/dashboard/ClinicalDashboardView";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireCommercialPageSession();
    if (Object.keys(await searchParams).length)
        notFound();
    return <ClinicalDashboardView data={demoContent("dashboard").dashboard} demo/>;
}
