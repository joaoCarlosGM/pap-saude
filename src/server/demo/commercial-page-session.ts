import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/server/security/constants";
import { CommercialAccessError, CommercialMfaRequiredError, requireCommercialSession } from "./commercial-access.service";
export async function requireCommercialPageSession({ allowMfaNotice = false }: { allowMfaNotice?: boolean } = {}) {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    try {
        return { ...await requireCommercialSession(token), mfaRequired: false as const };
    }
    catch (error) {
        if (error instanceof CommercialMfaRequiredError) {
            if (allowMfaNotice) return { mfaRequired: true as const };
            redirect("/comercial");
        }
        if (error instanceof CommercialAccessError)
            redirect("/login");
        throw error;
    }
}
