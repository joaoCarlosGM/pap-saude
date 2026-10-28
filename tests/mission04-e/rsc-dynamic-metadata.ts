/** Observed Next 16.4 navigation-only dynamic segment: webpack emits null,
 * Turbopack emits []. Neither representation may carry rendered/user data. */
export function isDynamicRouteMetadata(value: unknown, routeKey: string): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const segment = value as Record<string, unknown>;
    return Object.keys(segment).sort().join(",") === "k,n,s,t"
        && segment.n === "section" && segment.t === "d" && segment.k === routeKey
        && (segment.s === null || (Array.isArray(segment.s)
            && segment.s.length === 0 && Object.keys(segment.s).length === 0));
}
