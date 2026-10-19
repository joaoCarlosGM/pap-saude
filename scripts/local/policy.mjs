export const LOCAL_DB = "pap_admin_beta1_local";
export const LOCAL_CONTAINER = "pap-admin-beta1-local-db";
export const LOCAL_VOLUME = "pap-admin-beta1-local-data";
export const LOCAL_LABEL = "pap.local=admin-beta1";
export function assertLocalUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "15432" ||
    u.pathname !== `/${LOCAL_DB}` ||
    u.search !== "?schema=public" ||
    u.hash
  )
    throw new Error("LOCAL_DATABASE_ONLY");
  return u;
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

export function assertLocalContainer(object) {
  const binding = object.HostConfig?.PortBindings?.["5432/tcp"],
    mounts = object.Mounts;
  if (
    object.Config?.Labels?.["pap.local"] !== "admin-beta1" ||
    binding?.length !== 1 ||
    binding[0].HostIp !== "127.0.0.1" ||
    binding[0].HostPort !== "15432" ||
    mounts?.length !== 1 ||
    mounts[0].Type !== "volume" ||
    mounts[0].Name !== LOCAL_VOLUME ||
    mounts[0].Destination !== "/var/lib/postgresql/data"
  )
    throw new Error("LOCAL_CONTAINER_CONTRACT_REQUIRED");
}
