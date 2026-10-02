\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '=============================================='
\echo ' PAP SAUDE - FOUNDATION 02 CASCADE TEST'
\echo '=============================================='

-- Usuário temporário
INSERT INTO users
(id, email, "displayName", "isActive", "createdAt", "updatedAt")
VALUES
(
  'f02-cascade-user',
  'cascade-test@papsaude.local',
  'Cascade Test',
  TRUE,
  NOW(),
  NOW()
);

-- Password
INSERT INTO password_credentials
(
  id, "userId", "passwordHash",
  algorithm, "createdAt", "updatedAt"
)
VALUES
(
  'f02-cascade-password',
  'f02-cascade-user',
  'test-hash',
  'ARGON2ID',
  NOW(),
  NOW()
);

-- MFA
INSERT INTO mfa_factors
(
  id, "userId", type, status,
  "secretEncrypted", "createdAt", "enabledAt"
)
VALUES
(
  'f02-cascade-mfa',
  'f02-cascade-user',
  'TOTP',
  'ACTIVE',
  'encrypted-test',
  NOW(),
  NOW()
);

-- Recovery code
INSERT INTO mfa_recovery_codes
(
  id, "userId", "codeHash", "createdAt"
)
VALUES
(
  'f02-cascade-recovery',
  'f02-cascade-user',
  'cascade-recovery-hash',
  NOW()
);

-- Session
INSERT INTO sessions
(
  id, "userId", "tokenHash",
  "createdAt", "expiresAt", "lastSeenAt"
)
VALUES
(
  'f02-cascade-session',
  'f02-cascade-user',
  'cascade-session-hash',
  NOW(),
  NOW() + INTERVAL '8 hours',
  NOW()
);

\echo '[01] Fixtures criados'

DO $$
DECLARE
  total INTEGER;
BEGIN
  SELECT
      (SELECT COUNT(*) FROM password_credentials WHERE "userId"='f02-cascade-user')
    + (SELECT COUNT(*) FROM mfa_factors WHERE "userId"='f02-cascade-user')
    + (SELECT COUNT(*) FROM mfa_recovery_codes WHERE "userId"='f02-cascade-user')
    + (SELECT COUNT(*) FROM sessions WHERE "userId"='f02-cascade-user')
  INTO total;

  IF total <> 4 THEN
    RAISE EXCEPTION
      'TEST FAILURE: esperava 4 registros dependentes, encontrou %',
      total;
  END IF;
END $$;

\echo '     PASS'

\echo '[02] Excluindo User'

DELETE FROM users
WHERE id = 'f02-cascade-user';

\echo '     PASS'

\echo '[03] Validando ON DELETE CASCADE'

DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT
      (SELECT COUNT(*) FROM password_credentials WHERE "userId"='f02-cascade-user')
    + (SELECT COUNT(*) FROM mfa_factors WHERE "userId"='f02-cascade-user')
    + (SELECT COUNT(*) FROM mfa_recovery_codes WHERE "userId"='f02-cascade-user')
    + (SELECT COUNT(*) FROM sessions WHERE "userId"='f02-cascade-user')
  INTO remaining;

  IF remaining <> 0 THEN
    RAISE EXCEPTION
      'TEST FAILURE: % registros sobreviveram ao DELETE do User',
      remaining;
  END IF;
END $$;

\echo '     PASS'

\echo ''
\echo '=============================================='
\echo ' FOUNDATION 02 CASCADE: PASS'
\echo '=============================================='

ROLLBACK;

\echo 'ROLLBACK concluido.'
