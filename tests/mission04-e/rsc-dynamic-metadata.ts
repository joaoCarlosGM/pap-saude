/** Next 16.4 TransportDynamicSegment.s is static siblings (rsc-transport.d.ts).
 * The only static sibling of /vitrine/[section] is pacientes, for the nested
 * synthetic /vitrine/pacientes/[id] route. Never accept rendered/user data. */
export function isDynamicRouteMetadata(value: unknown, routeKey: string): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const segment = value as Record<string, unknown>;
    return Object.keys(segment).sort().join(",") === "k,n,s,t"
        && segment.n === "section" && segment.t === "d" && segment.k === routeKey
        && (segment.s === null || (Array.isArray(segment.s)
            && ((segment.s.length === 0 && Object.keys(segment.s).length === 0)
                || (segment.s.length === 1 && segment.s[0] === "pacientes"
                    && Object.keys(segment.s).join(",") === "0"))));
}
