import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertLocalContainer,
  assertLocalUrl,
  assertDockerEndpoint,
} from "../../scripts/local/policy.mjs";
test("local database policy refuses all remote, default-port and ambiguous targets", () => {
  assert.doesNotThrow(() =>
    assertLocalUrl(
      "postgresql://u:p@127.0.0.1:15432/pap_admin_beta1_local?schema=public",
    ),
  );
  for (const url of [
    "postgresql://u:p@vps.invalid:15432/pap_admin_beta1_local?schema=public",
    "postgresql://u:p@127.0.0.1:5432/pap_admin_beta1_local?schema=public",
    "postgresql://u:p@127.0.0.1:15432/pap_prod?schema=public",
    "postgresql://u:p@localhost:15432/pap_admin_beta1_local?schema=public",
    "postgresql://u:p@127.0.0.1:15432/pap_admin_beta1_local?host=evil",
  ])
    assert.throws(() => assertLocalUrl(url));
});
test("only explicitly local Docker transports are accepted", () => {
  for (const endpoint of [
    "unix:///var/run/docker.sock",
    "npipe:////./pipe/docker_engine",
  ])
    assert.doesNotThrow(() => assertDockerEndpoint(endpoint));
  for (const endpoint of [
    "ssh://vps.invalid",
    "tcp://127.0.0.1:2375",
    "tcp://vps.invalid:2376",
  ])
    assert.throws(() => assertDockerEndpoint(endpoint));
});

test("container isolation rejects bind mounts, foreign volumes and public bindings", () => {
  const object = {
    Config: { Labels: { "pap.local": "admin-beta1" } },
    HostConfig: {
      PortBindings: {
        "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "15432" }],
      },
    },
    Mounts: [
      {
        Type: "volume",
        Name: "pap-admin-beta1-local-data",
        Destination: "/var/lib/postgresql/data",
      },
    ],
  };
  assert.doesNotThrow(() => assertLocalContainer(object));
  for (const mutate of [
    (c) => (c.Mounts[0].Type = "bind"),
    (c) => (c.Mounts[0].Name = "foreign"),
    (c) => (c.HostConfig.PortBindings["5432/tcp"][0].HostIp = "0.0.0.0"),
    (c) => (c.Config.Labels["pap.local"] = "foreign"),
  ]) {
    const copy = structuredClone(object);
    mutate(copy);
    assert.throws(() => assertLocalContainer(copy));
  }
});

test("private local credentials and captured tokens are excluded from Git and Docker contexts", async () => {
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync(".gitignore", "utf8"), /^\/\.local\/$/m);
  assert.match(readFileSync(".dockerignore", "utf8"), /^\.local$/m);
});
