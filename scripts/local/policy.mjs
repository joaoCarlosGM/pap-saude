import { LOCAL_LAB_PROFILES, localLabProfile, assertLabDatabaseUrl } from "../../src/lib/local-lab-profiles.mjs";
export { localLabProfile };
export const LOCAL_DB = "pap_admin_beta1_local";
export const LOCAL_CONTAINER = "pap-admin-beta1-local-db";
export const LOCAL_VOLUME = "pap-admin-beta1-local-data";
export const LOCAL_LABEL = "pap.local=admin-beta1";
export function assertLocalUrl(value, profile = "admin-beta1") {
  return assertLabDatabaseUrl(value, profile);
}
export function parseLocalArguments(args) {
  const flags = args.filter(a => a.startsWith("--profile="));
  if (flags.length > 1 || args.some(a => a.startsWith("--") && !a.startsWith("--profile=")))
    throw new Error("INVALID_LOCAL_ARGUMENTS");
  const profile = localLabProfile(flags.length ? flags[0].slice("--profile=".length) : "admin-beta1");
  const commandArgs = args.filter(a => !a.startsWith("--profile="));
  if (!["init", "start", "stop", "migrate", "admin", "dev", "mail", "seed"].includes(commandArgs[0]) ||
      commandArgs.length > (commandArgs[0] === "mail" ? 2 : 1))
    throw new Error("INVALID_LOCAL_ARGUMENTS");
  if (commandArgs[0] === "seed" && profile.name !== "p0-unified-rc") throw new Error("UNIFIED_PROFILE_ONLY");
  return { profile, commandArgs };
}
export function assertSeparateCheckout(profile, hasPath) {
  for (const other of Object.values(LOCAL_LAB_PROFILES))
    if (other.name !== profile && hasPath(other.privateDir))
      throw new Error("LOCAL_PROFILE_REQUIRES_SEPARATE_CHECKOUT");
}
export function assertLocalVolume(object, profile = "admin-beta1") {
  const p = localLabProfile(profile);
  if (!object || object.Labels?.["pap.local"] !== p.name ||
      object.Driver !== "local" || Object.keys(object.Options || {}).length ||
      (object.Name && object.Name !== p.volume)) throw new Error("LOCAL_PLAIN_VOLUME_REQUIRED");
}
export function assertDockerEndpoint(endpoint) {
  if (
    ![
      "unix:///var/run/docker.sock",
      "npipe:////./pipe/docker_engine",
      "npipe:////./pipe/dockerDesktopLinuxEngine",
    ].includes(endpoint) &&
    !/^unix:\/\/\/(?:home\/[^/]+\/\.docker\/desktop|run\/user\/\d+)\/docker\.sock$/.test(
      endpoint,
    )
  )
    throw new Error("LOCAL_DOCKER_CONTEXT_REQUIRED");
}

export function assertLocalContainer(object, profile = "admin-beta1") {
  const p = localLabProfile(profile);
  const binding = object.HostConfig?.PortBindings?.["5432/tcp"],
    mounts = object.Mounts;
  if (
    object.Config?.Labels?.["pap.local"] !== p.name ||
    binding?.length !== 1 ||
    binding[0].HostIp !== "127.0.0.1" ||
    binding[0].HostPort !== p.dbPort ||
    mounts?.length !== 1 ||
    mounts[0].Type !== "volume" ||
    mounts[0].Name !== p.volume ||
    mounts[0].Destination !== "/var/lib/postgresql/data"
  )
    throw new Error("LOCAL_CONTAINER_CONTRACT_REQUIRED");
}
