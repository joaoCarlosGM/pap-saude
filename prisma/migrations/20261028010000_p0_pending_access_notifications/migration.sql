-- Forward-only domain extension. Existing rows, FK, deduplication and ACL remain.
-- Required because PostgreSQL (not only TypeScript) validates notification kinds.
BEGIN;
ALTER TABLE "user_notifications"
  DROP CONSTRAINT "access_notification_kind",
  ADD CONSTRAINT "access_notification_kind"
    CHECK ("kind" IN ('ACCESS_APPROVED', 'ACCESS_REVOKED', 'ACCESS_PENDING_DECISION'));
COMMIT;
