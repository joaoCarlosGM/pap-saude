import assert from "node:assert/strict";
import { test } from "node:test";
import { isDynamicRouteMetadata } from "./rsc-dynamic-metadata";

test("RSC accepts unknown/empty siblings and only the known public static siblings", () => {
    for (const s of [null, [], ["pacientes"], ["aprender"], ["aprender","pacientes"], ["pacientes","aprender"]])
        assert.equal(isDynamicRouteMetadata({ n: "section", t: "d", k: "pacientes", s }, "pacientes"), true);
});

test("RSC rejects payloads, wrong routes, missing/extra keys and arbitrary static siblings", () => {
    const valid = { n: "section", t: "d", k: "pacientes", s: null };
    const cases: unknown[] = [
        null, [], "rendered content", {},
        { ...valid, n: "other" }, { ...valid, t: "other" },
        { ...valid, k: "foreign" }, { n: "section", t: "d", k: "pacientes" },
        { ...valid, clinical: "synthetic forbidden payload" },
        ...["", "$undefined", 0, false, {}, [null], [""], ["synthetic payload"], ["patients"], ["pacientes", "clinical"], ["pacientes", "pacientes"], ["aprender", "aprender"], ["aprender","private"], [["pacientes"]], [{clinical:"payload"}]].map(s => ({ ...valid, s })),
    ];
    const decorated: unknown[] & { payload?: string } = [];
    decorated.payload = "synthetic forbidden payload";
    cases.push({ ...valid, s: decorated });
    const decoratedSibling=Object.assign(["pacientes"],{payload:"synthetic forbidden payload"});cases.push({...valid,s:decoratedSibling});
    for (const candidate of cases) assert.equal(isDynamicRouteMetadata(candidate, "pacientes"), false);
});
