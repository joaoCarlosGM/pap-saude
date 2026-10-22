import type { EffectiveAccessProfile } from "@/lib/admin/types";
/** Navigation only. Server authorization remains mandatory at each destination. */
export function accessDestination(profile: EffectiveAccessProfile | null) {
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
  return "/login";
}
