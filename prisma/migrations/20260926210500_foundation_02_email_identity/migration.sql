-- Foundation 02 — canonical user email identity
--
-- Authentication normalizes e-mail with trim + lowercase.
-- This constraint makes the database enforce the same invariant.
--
-- Combined with the existing UNIQUE constraint on users.email,
-- this prevents identities that differ only by case or surrounding
-- whitespace.

ALTER TABLE "users"
ADD CONSTRAINT "users_email_must_be_canonical"
CHECK (
  "email" = lower(btrim("email"))
);
