import type { EffectiveAccessProfile } from "@/lib/admin/types";
/** Navigation only. Server authorization remains mandatory at each destination. */
export function accessDestination(profile: EffectiveAccessProfile | null) {
  if (profile?.canAccessAdmin && profile.roles.some(r=>r.key==="PAP_MANAGER"&&r.scope==="GLOBAL")&&!profile.roles.some(r=>r.key==="PAP_ADMIN"&&r.scope==="GLOBAL")) return "/admin/manager";
  if (profile?.canAccessAdmin) return "/admin";
  if (
    profile?.roles.some(
      (r) =>
        r.scope === "HEALTH_UNIT" &&
        r.organization &&
        r.permissions.includes("patient.read"),
    )
  )
    return "/dashboard";
  if (profile?.roles.some(r => r.key === "COMMERCIAL" && r.scope === "GLOBAL" && r.permissions.includes("commercial.read")))
    return "/comercial";
  return "/login";
}
