# RNDS integration boundary

RNDS enablement is scoped per health unit.

The PAP database is the source of truth for integration state. n8n may orchestrate notifications and operational workflows, but it must not become the source of truth for RNDS status, authorization, clinical rules, or transmission eligibility.

No production RNDS payload mapping is implemented in Foundation 01. Mapping, terminology, authentication and transmission rules must be implemented against the official specification used during homologation.
