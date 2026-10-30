import { cookies } from "next/headers";
import {coursePageSession} from "@/server/courses/page-session";
import { SESSION_COOKIE_NAME } from "@/server/security/constants";
import { ownProfile } from "@/server/account/own-profile.service";
import OwnProfileSettings from "@/components/configuracoes/OwnProfileSettings";
export const dynamic = "force-dynamic";
export default async function ConfiguracoesPage() {
 await coursePageSession();
 const profile=await ownProfile((await cookies()).get(SESSION_COOKIE_NAME)?.value??"");
 return <div className="mx-auto w-full max-w-4xl"><OwnProfileSettings initial={profile}/></div>;
}
