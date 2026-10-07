import assert from "node:assert/strict"
import test from "node:test"

import {
  roleAllowsOrganization,
} from "../../src/server/admin/admin-access-policy"

import {
  PERMISSIONS,
} from "../../src/server/iam/permissions"

test(
  "GLOBAL role reaches any organization",
  () => {
    assert.equal(
      roleAllowsOrganization(
        {
          scope:
            "GLOBAL",
          organizationId:
            null,
          permissions: [
            PERMISSIONS.ORGANIZATION_MANAGE,
          ],
        },
        PERMISSIONS.ORGANIZATION_MANAGE,
        {
          id:
            "ubs-b",
          type:
            "HEALTH_UNIT",
          parentId:
            "municipality-b",
        },
      ),
      true,
    )
  },
)

test(
  "municipality role reaches itself and direct health units only",
  () => {
    const role = {
      scope:
        "MUNICIPALITY" as const,
      organizationId:
        "municipality-a",
      permissions: [
        PERMISSIONS.ORGANIZATION_MANAGE,
      ],
    }

    assert.equal(
      roleAllowsOrganization(
        role,
        PERMISSIONS.ORGANIZATION_MANAGE,
        {
          id:
            "municipality-a",
          type:
            "MUNICIPALITY",
          parentId:
            "pap",
        },
      ),
      true,
    )

    assert.equal(
      roleAllowsOrganization(
        role,
        PERMISSIONS.ORGANIZATION_MANAGE,
        {
          id:
            "ubs-a",
          type:
            "HEALTH_UNIT",
          parentId:
            "municipality-a",
        },
      ),
      true,
    )

    assert.equal(
      roleAllowsOrganization(
        role,
        PERMISSIONS.ORGANIZATION_MANAGE,
        {
          id:
            "ubs-b",
          type:
            "HEALTH_UNIT",
          parentId:
            "municipality-b",
        },
      ),
      false,
    )
  },
)

test(
  "health unit scope never reaches another health unit",
  () => {
    assert.equal(
      roleAllowsOrganization(
        {
          scope:
            "HEALTH_UNIT",
          organizationId:
            "ubs-a",
          permissions: [
            PERMISSIONS.ORGANIZATION_READ,
          ],
        },
        PERMISSIONS.ORGANIZATION_READ,
        {
          id:
            "ubs-b",
          type:
            "HEALTH_UNIT",
          parentId:
            "municipality-a",
        },
      ),
      false,
    )
  },
)

test(
  "missing permission fails closed even when scope matches",
  () => {
    assert.equal(
      roleAllowsOrganization(
        {
          scope:
            "GLOBAL",
          organizationId:
            null,
          permissions: [
            PERMISSIONS.ORGANIZATION_READ,
          ],
        },
        PERMISSIONS.ORGANIZATION_MANAGE,
        {
          id:
            "municipality-a",
          type:
            "MUNICIPALITY",
          parentId:
            "pap",
        },
      ),
      false,
    )
  },
)
