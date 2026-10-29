import { notFound } from "next/navigation";
import { requireCommercialPageSession } from "@/server/demo/commercial-page-session";
import PremiumSectionView from "@/features/vitrine-premium/SectionView";
import {isPremiumSection} from "@/features/vitrine-premium/lib/routes";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireCommercialPageSession();
    const { section } = await params;
    if (!isPremiumSection(section) || Object.keys(await searchParams).length) notFound();
    return <PremiumSectionView section={section}/>;
}
