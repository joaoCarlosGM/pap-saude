/** Next 16.4 TransportDynamicSegment.s is static siblings (rsc-transport.d.ts).
 * The closed static siblings of /vitrine/[section] are pacientes and aprender,
 * for guarded nested synthetic routes. Never accept rendered/user data. */
export function isDynamicRouteMetadata(value: unknown, routeKey: string): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const segment = value as Record<string, unknown>;
    const siblings=segment.s;
    return Object.keys(segment).sort().join(",") === "k,n,s,t"
        && segment.n === "section" && segment.t === "d" && segment.k === routeKey
        && (siblings === null || (Array.isArray(siblings)
            && Object.keys(siblings).length===siblings.length && Object.keys(siblings).every((key,index)=>key===String(index))
            && new Set(siblings).size===siblings.length
            && siblings.every(item=>['pacientes','aprender'].includes(item))));
}
