import {redirect} from "next/navigation";
import type { Metadata } from "next";
import { requireCommercialPageSession } from "@/server/demo/commercial-page-session";
import PremiumShell from "@/features/vitrine-premium/components/layout/DashboardShell";
export const metadata: Metadata = { title: "Vitrine demonstrativa · PAP Saúde", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export default async function Layout({ children }: {
    children: React.ReactNode;
}) {
    const actor = await requireCommercialPageSession();
    if (actor.mfaRequired) redirect("/primeiros-passos");
    return <PremiumShell>{children}</PremiumShell>;
}
