/** Deployment availability, never a substitute for the global COMMERCIAL + MFA guard. */
export function betaCommercialEnabled(value: string | undefined) { return value === "1"; }
export const BETA_COMMERCIAL_PAGES: readonly string[] = ["/comercial"];
export const BETA_COMMERCIAL_PATTERNS: readonly string[] = [];
export function betaCommercialPathAllowed(path: string, method: string) {
  return ["GET", "HEAD"].includes(method) && (BETA_COMMERCIAL_PAGES.includes(path) || BETA_COMMERCIAL_PATTERNS.some(pattern => new RegExp(`^${pattern}$`).test(path)));
}
