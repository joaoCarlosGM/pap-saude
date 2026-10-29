import { notFound } from "next/navigation";
import { requireCommercialPageSession } from "@/server/demo/commercial-page-session";
import Dashboard from "@/features/vitrine-premium/views/dashboard";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireCommercialPageSession();
    if (Object.keys(await searchParams).length)
        notFound();
    return <Dashboard/>;
}
