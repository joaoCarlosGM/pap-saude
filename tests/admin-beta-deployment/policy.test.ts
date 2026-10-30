import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../../src/proxy";
import { adminBetaOnly, adminBetaPathAllowed } from "../../src/lib/admin-beta-policy";

test("availability is closed by default in Beta; only explicit methods and routes pass", () => {
  for (const path of ["/dashboard", "/pacientes", "/registro", "/cursos", "/aprender/one", "/comercial", "/vitrine", "/api/clinical/patients", "/api/courses/me", "/api/vitrine/dashboard", "/admin/manager/cursos", "/admin/integracoes", "/api/email/resend/webhook", "/api/organization-requests", "/unknown", "/api/admin/unknown"]) for (const method of ["GET", "POST", "PATCH", "DELETE"]) assert.equal(adminBetaPathAllowed(path, method), false, `${method} ${path}`);
  for (const path of ["/login", "/primeiros-passos", "/admin", "/admin/manager", "/admin/acessos", "/admin/auditoria"]) assert.equal(adminBetaPathAllowed(path), true);
  assert.equal(adminBetaPathAllowed("/api/auth/security", "POST"), true);
  assert.equal(adminBetaPathAllowed("/api/auth/login", "GET"), false);
  assert.equal(adminBetaPathAllowed("/admin", "POST"), false);
});
test("encoded, double encoded, traversal, unknown admin suffixes and verbs never open a route", () => {
  for (const path of ["/%2561dmin", "/api/clinical%2fpatients", "/admin/../dashboard", "/admin//usuarios", "/admin%5cusuarios", "/admin%00", "/admin/new-feature", "/_next/data/id/dashboard.json"]) assert.equal(adminBetaPathAllowed(path), false, path);
  for (const value of ["true", "unexpected", "1"]) assert.equal(adminBetaOnly(value), true);
  for (const value of [undefined, "", "0"]) assert.equal(adminBetaOnly(value), false);
});
test("request enforcement requires the private proxy credential and cannot be disabled through headers", () => {
  const oldFlag = process.env.PAP_ADMIN_BETA_ONLY, oldKey = process.env.PAP_ADMIN_BETA_PROXY_TOKEN;
  try {
    process.env.PAP_ADMIN_BETA_ONLY = "1"; process.env.PAP_ADMIN_BETA_PROXY_TOKEN = "x".repeat(48);
    assert.equal(proxy(new NextRequest("http://beta.invalid/login")).status, 404);
    const headers = {"x-pap-beta-proxy-token":"x".repeat(48)};
    assert.equal(proxy(new NextRequest("http://beta.invalid/login", {headers})).status, 200);
    for (const path of ["/api/clinical/patients", "/dashboard", "/api/courses/me"]) assert.equal(proxy(new NextRequest("http://beta.invalid"+path,{headers:{...headers,RSC:"1","x-pap-admin-beta-only":"0"}})).status,404);
    assert.equal(proxy(new NextRequest("http://beta.invalid/login",{headers:{...headers,"x-middleware-subrequest":"proxy"}})).status,404);
    assert.equal(proxy(new NextRequest("http://beta.invalid/api/health")).status,200);
    delete process.env.PAP_ADMIN_BETA_ONLY;
    assert.equal(proxy(new NextRequest("http://beta.invalid/dashboard")).status,200);
  } finally {
    if(oldFlag===undefined)delete process.env.PAP_ADMIN_BETA_ONLY;else process.env.PAP_ADMIN_BETA_ONLY=oldFlag;
    if(oldKey===undefined)delete process.env.PAP_ADMIN_BETA_PROXY_TOKEN;else process.env.PAP_ADMIN_BETA_PROXY_TOKEN=oldKey;
  }
});
