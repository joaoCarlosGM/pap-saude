import { requireCommercialPageSession } from "@/server/demo/commercial-page-session";
import CommercialWorkspace, { CommercialMfaNotice } from "@/components/commercial/CommercialWorkspace";
import "@/components/access/access.css";
import "@/components/demo/workspace.css";
export const dynamic = "force-dynamic";
export default async function CommercialPage() {
    const actor = await requireCommercialPageSession({ allowMfaNotice: true });
    if (actor.mfaRequired) return <CommercialMfaNotice />;
    return <CommercialWorkspace name={actor.displayName}/>;
}
