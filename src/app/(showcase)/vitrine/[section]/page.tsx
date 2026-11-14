import { notFound } from "next/navigation";
import { requireCommercialPageSession } from "@/server/demo/commercial-page-session";
import PremiumSectionView from "@/features/vitrine-premium/SectionView";
import {isPremiumSection} from "@/features/vitrine-premium/lib/routes";
import {parseProtocolLocation} from "@/features/vitrine-premium/lib/protocol-catalog";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: {
    params: Promise<{
        section: string;
    }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    await requireCommercialPageSession();
    const { section } = await params;
    const search=await searchParams;
    if (!isPremiumSection(section)) notFound();
    if(section==='protocolos'){
        const location=parseProtocolLocation(search);
        if(!location)notFound();
        return <PremiumSectionView section={section} protocolLocation={location}/>;
    }
    if(Object.keys(search).length)notFound();
    return <PremiumSectionView section={section}/>;
}
