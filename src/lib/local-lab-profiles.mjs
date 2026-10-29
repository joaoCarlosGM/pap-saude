// Fixed development destinations only; these descriptors contain no credentials.
export const LOCAL_LAB_PROFILES = Object.freeze({
  "admin-beta1": Object.freeze({
    name: "admin-beta1", appPort: "3100", dbPort: "15432",
    database: "pap_admin_beta1_local", user: "pap_local",
    container: "pap-admin-beta1-local-db", volume: "pap-admin-beta1-local-data",
    privateDir: ".local/pap-admin", marker: "pap-local-admin-beta1",
    keyId: "local-admin-beta1",
  }),
  "p0-unified-rc": Object.freeze({
    name: "p0-unified-rc", appPort: "3600", dbPort: "15436",
    database: "pap_p0_unified_rc", user: "pap_unified",
    container: "pap-p0-unified-rc-db", volume: "pap-p0-unified-rc-data",
    privateDir: ".local/pap-p0-unified-rc", marker: "pap-local-p0-unified-rc",
    keyId: "local-p0-unified-rc",
  }),
  "p0-acceptance": Object.freeze({
    name: "p0-acceptance", appPort: "3200", dbPort: "15433",
    database: "pap_p0_acceptance", user: "pap_p0",
    container: "pap-p0-acceptance-db", volume: "pap-p0-acceptance-data",
    privateDir: ".local/pap-p0-acceptance", marker: "pap-local-p0-acceptance",
    keyId: "local-p0-acceptance",
  }),
});
export function localLabProfile(name = "admin-beta1") {
  if (!Object.hasOwn(LOCAL_LAB_PROFILES, name)) throw new Error("UNKNOWN_LOCAL_PROFILE");
  return LOCAL_LAB_PROFILES[name];
}
export function assertLabDatabaseUrl(value, name = "admin-beta1") {
  const p = localLabProfile(name), u = new URL(value);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" ||
      u.port !== p.dbPort || u.pathname !== `/${p.database}` ||
      u.search !== "?schema=public" || u.hash ||
      (p.name !== "admin-beta1" && u.username !== p.user))
    throw new Error("LOCAL_DATABASE_ONLY");
  return u;
}
export function operatorMailProfile(env) {
  try {
    const p = localLabProfile(env.PAP_LOCAL_PROFILE || "admin-beta1");
    assertLabDatabaseUrl(env.DATABASE_URL || "", p.name);
    if (env.NODE_ENV !== "development" || env.PAP_LOCAL_DEMO !== "1" ||
        env.PAP_EMAIL_PROVIDER !== "local-demo" || env.PAP_LOCAL_MAIL_TEST_DIR ||
        env.PAP_LOCAL_DEMO_TEST === "1" ||
        env.PAP_PUBLIC_URL !== `http://127.0.0.1:${p.appPort}`) return null;
    return p;
  } catch { return null; }
}
