import assert from "node:assert/strict";
import { test } from "node:test";
import { isDynamicRouteMetadata } from "./rsc-dynamic-metadata";

test("RSC accepts only the two observed empty-suffix representations", () => {
    for (const s of [null, []])
        assert.equal(isDynamicRouteMetadata({ n: "section", t: "d", k: "pacientes", s }, "pacientes"), true);
});

test("RSC rejects payloads, wrong routes, missing/extra keys and nonempty suffixes", () => {
    const valid = { n: "section", t: "d", k: "pacientes", s: null };
    const cases: unknown[] = [
        null, [], "rendered content", {},
        { ...valid, n: "other" }, { ...valid, t: "other" },
        { ...valid, k: "foreign" }, { n: "section", t: "d", k: "pacientes" },
        { ...valid, clinical: "synthetic forbidden payload" },
        ...["", "$undefined", 0, false, {}, [null], [""], ["synthetic payload"]].map(s => ({ ...valid, s })),
    ];
    const decorated: unknown[] & { payload?: string } = [];
    decorated.payload = "synthetic forbidden payload";
    cases.push({ ...valid, s: decorated });
    for (const candidate of cases) assert.equal(isDynamicRouteMetadata(candidate, "pacientes"), false);
});
