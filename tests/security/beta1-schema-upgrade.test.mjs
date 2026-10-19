import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import pg from "pg";
test("incremental Beta migration preserves populated F04 identities, requests and invitations", async () => {
  assert.equal(
    execFileSync(
      "docker",
      [
        "inspect",
        "-f",
        '{{index .Config.Labels "pap.disposable"}}',
        "pap_saude_db",
      ],
      { encoding: "utf8" },
    ).trim(),
    "f0410",
  );
  const name = `pap_beta1_upgrade_${process.pid}`;
  const admin = new pg.Client({
    connectionString:
      "postgresql://pap_user:pap_password@127.0.0.1:5432/postgres",
  });
  await admin.connect();
  let client;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    client = new pg.Client({
      connectionString: `postgresql://pap_user:pap_password@127.0.0.1:5432/${name}`,
    });
    await client.connect();
    const migration = "20261020000000_admin_beta1";
    for (const dir of readdirSync("prisma/migrations")
      .filter((d) => d < migration && d !== "migration_lock.toml")
      .sort())
      await client.query(
        readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"),
      );
    const [user, pap, city, unit, candidate, request, invitation] = Array.from(
      { length: 7 },
      () => randomUUID(),
    );
    await client.query(
      'INSERT INTO users (id,email,"displayName","updatedAt") VALUES ($1,$2,$3,now())',
      [user, "legacy@synthetic.invalid", "Synthetic Existing Identity"],
    );
    await client.query(
      `INSERT INTO organizations (id,type,status,name,"parentId","updatedAt") VALUES ($1,'PAP','ACTIVE','Synthetic PAP',NULL,now()),($2,'MUNICIPALITY','ACTIVE','Synthetic City',$1,now()),($3,'HEALTH_UNIT','ACTIVE','Synthetic UBS',$2,now())`,
      [pap, city, unit],
    );
    await client.query(
      `INSERT INTO organization_candidates (id,type,name,"normalizedName","dedupeKey","updatedAt") VALUES ($1,'HEALTH_UNIT','Legacy synthetic request','legacy synthetic request',$1,now())`,
      [candidate],
    );
    await client.query(
      `INSERT INTO organization_requests (id,"candidateId","requestedByUserId","updatedAt") VALUES ($1,$2,$3,now())`,
      [request, candidate, user],
    );
    await client.query(
      `INSERT INTO user_invitations (id,email,"displayName","userId","organizationId","roleKey","tokenHash","expiresAt","invitedByUserId","updatedAt") VALUES ($1,'legacy@synthetic.invalid','Synthetic Existing Identity',$2,$3,'PROFESSIONAL',$4,now()+interval '2 days',$2,now())`,
      [invitation, user, unit, "a".repeat(64)],
    );
    const before = (
      await client.query('SELECT id,email,"displayName" FROM users')
    ).rows;
    await client.query(
      readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
    assert.deepEqual(
      (await client.query('SELECT id,email,"displayName" FROM users')).rows,
      before,
    );
    assert.equal(
      (
        await client.query(
          'SELECT "requestedByUserId" FROM organization_requests WHERE id=$1',
          [request],
        )
      ).rows[0].requestedByUserId,
      user,
    );
    assert.equal(
      (
        await client.query(
          'SELECT "deliveryStatus" FROM user_invitations WHERE id=$1',
          [invitation],
        )
      ).rows[0].deliveryStatus,
      "NOT_ATTEMPTED",
    );
    assert.equal(
      (
        await client.query(
          'SELECT "contactEmail" FROM organization_candidates WHERE id=$1',
          [candidate],
        )
      ).rows[0].contactEmail,
      null,
    );
    await client.query(
      'INSERT INTO organization_requests (id,"candidateId","updatedAt") VALUES ($1,$2,now())',
      [randomUUID(), candidate],
    );
    assert.equal(
      Number(
        (await client.query("SELECT count(*) AS n FROM organization_requests"))
          .rows[0].n,
      ),
      2,
    );
  } finally {
    if (client) await client.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  }
});
