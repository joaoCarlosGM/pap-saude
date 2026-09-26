# PAP Saúde server modules

This directory is the server-side modular-monolith boundary.

- `db`: database access
- `iam`: roles and permissions
- `organizations`: municipality/unit scope
- `clinical`: clinical core
- `audit`: immutable operational/audit events
- `interoperability`: provider-neutral interoperability policies
- `integrations/rnds`: RNDS lifecycle and adapter boundary

Do not import server modules into client components.
