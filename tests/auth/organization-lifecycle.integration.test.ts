import assert from "node:assert/strict";

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  activateOrganization,
  archiveOrganization,
  createOrganization,
  searchOrganizations,
  suspendOrganization,
} from "../../src/server/organizations/organization.service";

import {
  InvalidOrganizationHierarchyError,
  InvalidOrganizationIdentifierError,
} from "../../src/server/organizations/organization.errors";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

async function assertSafeDatabase(): Promise<void> {
  const rows =
    await db.$queryRaw<
      Array<{ database: string }>
    >`SELECT current_database() AS database`;

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  );
}

async function clearFixtures(): Promise<void> {
  await db.organization.deleteMany();
}

before(async () => {
  await assertSafeDatabase();
  await clearFixtures();
});

beforeEach(async () => {
  await clearFixtures();
});

after(async () => {
  await clearFixtures();
});

test(
  "creates PAP root organization without parent",
  async () => {
    const pap =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
        status:
          OrganizationStatus.ACTIVE,
      });

    assert.equal(
      pap.parentId,
      null,
    );

    assert.equal(
      pap.status,
      OrganizationStatus.ACTIVE,
    );

    assert.equal(
      pap.isActive,
      true,
    );
  },
);

test(
  "creates municipality under PAP",
  async () => {
    const pap =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
        status:
          OrganizationStatus.ACTIVE,
      });

    const municipality =
      await createOrganization({
        type:
          OrganizationType.MUNICIPALITY,
        name:
          "Belém",
        parentId:
          pap.id,
        city:
          "Belém",
        state:
          "pa",
      });

    assert.equal(
      municipality.parentId,
      pap.id,
    );

    assert.equal(
      municipality.state,
      "PA",
    );
  },
);

test(
  "creates health unit under municipality with normalized CNES",
  async () => {
    const pap =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
        status:
          OrganizationStatus.ACTIVE,
      });

    const municipality =
      await createOrganization({
        type:
          OrganizationType.MUNICIPALITY,
        name:
          "Belém",
        parentId:
          pap.id,
      });

    const unit =
      await createOrganization({
        type:
          OrganizationType.HEALTH_UNIT,
        name:
          "Unidade de Saúde Exemplo",
        parentId:
          municipality.id,
        cnes:
          "1234567",
        city:
          "Belém",
        state:
          "PA",
      });

    assert.equal(
      unit.cnes,
      "1234567",
    );

    assert.equal(
      unit.parentId,
      municipality.id,
    );
  },
);

test(
  "rejects municipality without PAP parent",
  async () => {
    await assert.rejects(
      () =>
        createOrganization({
          type:
            OrganizationType.MUNICIPALITY,
          name:
            "Belém",
        }),
      InvalidOrganizationHierarchyError,
    );
  },
);

test(
  "rejects health unit directly under PAP",
  async () => {
    const pap =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
        status:
          OrganizationStatus.ACTIVE,
      });

    await assert.rejects(
      () =>
        createOrganization({
          type:
            OrganizationType.HEALTH_UNIT,
          name:
            "Unidade inválida",
          parentId:
            pap.id,
          cnes:
            "1234567",
        }),
      InvalidOrganizationHierarchyError,
    );
  },
);

test(
  "rejects malformed CNES",
  async () => {
    const pap =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
      });

    const municipality =
      await createOrganization({
        type:
          OrganizationType.MUNICIPALITY,
        name:
          "Belém",
        parentId:
          pap.id,
      });

    await assert.rejects(
      () =>
        createOrganization({
          type:
            OrganizationType.HEALTH_UNIT,
          name:
            "Unidade",
          parentId:
            municipality.id,
          cnes:
            "123",
        }),
      InvalidOrganizationIdentifierError,
    );
  },
);

test(
  "searches organizations by name CNES and location",
  async () => {
    const pap =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
        status:
          OrganizationStatus.ACTIVE,
      });

    const municipality =
      await createOrganization({
        type:
          OrganizationType.MUNICIPALITY,
        name:
          "Belém",
        parentId:
          pap.id,
        status:
          OrganizationStatus.ACTIVE,
      });

    await createOrganization({
      type:
        OrganizationType.HEALTH_UNIT,
      name:
        "UBS Marco",
      parentId:
        municipality.id,
      cnes:
        "7654321",
      city:
        "Belém",
      state:
        "PA",
      status:
        OrganizationStatus.ACTIVE,
    });

    const byName =
      await searchOrganizations({
        query:
          "marco",
        type:
          OrganizationType.HEALTH_UNIT,
      });

    assert.equal(
      byName.length,
      1,
    );

    const byCnes =
      await searchOrganizations({
        query:
          "7654321",
      });

    assert.equal(
      byCnes.length,
      1,
    );

    const byLocation =
      await searchOrganizations({
        city:
          "belém",
        state:
          "pa",
      });

    assert.equal(
      byLocation.length,
      1,
    );
  },
);

test(
  "organization lifecycle active suspended active",
  async () => {
    const organization =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
      });

    const active =
      await activateOrganization(
        organization.id,
      );

    assert.equal(
      active.status,
      OrganizationStatus.ACTIVE,
    );

    assert.equal(
      active.isActive,
      true,
    );

    const suspended =
      await suspendOrganization(
        organization.id,
      );

    assert.equal(
      suspended.status,
      OrganizationStatus.SUSPENDED,
    );

    assert.equal(
      suspended.isActive,
      false,
    );

    const reactivated =
      await activateOrganization(
        organization.id,
      );

    assert.equal(
      reactivated.status,
      OrganizationStatus.ACTIVE,
    );
  },
);

test(
  "cannot archive organization that still has non-archived children",
  async () => {
    const pap =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
      });

    await createOrganization({
      type:
        OrganizationType.MUNICIPALITY,
      name:
        "Belém",
      parentId:
        pap.id,
    });

    await assert.rejects(
      () =>
        archiveOrganization(
          pap.id,
        ),
      InvalidOrganizationHierarchyError,
    );
  },
);

test(
  "archives leaf organization",
  async () => {
    const organization =
      await createOrganization({
        type:
          OrganizationType.PAP,
        name:
          "PAP Saúde",
      });

    const archived =
      await archiveOrganization(
        organization.id,
      );

    assert.equal(
      archived.status,
      OrganizationStatus.ARCHIVED,
    );

    assert.equal(
      archived.isActive,
      false,
    );
  },
);
