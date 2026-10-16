-- F04.6: additive indexes; no historical migration changed.
CREATE INDEX IF NOT EXISTS "audit_events_action_occurredAt_idx" ON "audit_events"("action", "occurredAt");
CREATE INDEX IF NOT EXISTS "audit_events_outcome_occurredAt_idx" ON "audit_events"("outcome", "occurredAt");
