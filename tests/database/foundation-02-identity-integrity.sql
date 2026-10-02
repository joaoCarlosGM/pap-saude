\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '================================================'
\echo ' PAP SAUDE - FOUNDATION 02 IDENTITY TEST'
\echo '================================================'

-- ============================================================
-- 01. USER
-- ============================================================

\echo '[01] Criando usuario base'

INSERT INTO users
(id, email, "displayName", "isActive", "createdAt", "updatedAt")
VALUES
(
  'f02-user',
  'f02-test@papsaude.local',
  'Foundation 02 Test',
  TRUE,
  NOW(),
  NOW()
);

\echo '     PASS'

-- ============================================================
-- 02. PASSWORD CREDENTIAL
-- ============================================================

\echo '[02] Criando PasswordCredential'

INSERT INTO password_credentials
(
  id,
  "userId",
  "passwordHash",
  algorithm,
  "mustChange",
  "changedAt",
  "createdAt",
  "updatedAt"
)
VALUES
(
  'f02-password',
  'f02-user',
  'argon2id-test-hash',
  'ARGON2ID',
  FALSE,
  NOW(),
  NOW(),
  NOW()
);

\echo '     PASS'

-- ============================================================
-- 03. PASSWORD 1:1
-- ============================================================

\echo '[03] Segunda credencial de senha deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO password_credentials
    (
      id,
      "userId",
      "passwordHash",
      algorithm,
      "changedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES
    (
      'f02-password-duplicate',
      'f02-user',
      'another-hash',
      'ARGON2ID',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: segunda PasswordCredential foi aceita';

  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 04. PENDING MFA
-- ============================================================

\echo '[04] TOTP PENDING valido'

INSERT INTO mfa_factors
(
  id,
  "userId",
  type,
  status,
  "secretEncrypted",
  "createdAt"
)
VALUES
(
  'f02-mfa-pending',
  'f02-user',
  'TOTP',
  'PENDING',
  'encrypted-test-secret-pending',
  NOW()
);

\echo '     PASS'

-- ============================================================
-- 05. ACTIVE MFA
-- ============================================================

\echo '[05] TOTP ACTIVE valido'

INSERT INTO mfa_factors
(
  id,
  "userId",
  type,
  status,
  "secretEncrypted",
  "createdAt",
  "enabledAt"
)
VALUES
(
  'f02-mfa-active',
  'f02-user',
  'TOTP',
  'ACTIVE',
  'encrypted-test-secret-active',
  NOW(),
  NOW()
);

\echo '     PASS'

-- ============================================================
-- 06. ACTIVE SEM enabledAt
-- ============================================================

\echo '[06] ACTIVE sem enabledAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO mfa_factors
    (
      id,
      "userId",
      type,
      status,
      "secretEncrypted",
      "createdAt"
    )
    VALUES
    (
      'f02-mfa-invalid-active',
      'f02-user',
      'TOTP',
      'ACTIVE',
      'encrypted-invalid',
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: ACTIVE sem enabledAt foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 07. SEGUNDO ACTIVE
-- ============================================================

\echo '[07] Segundo TOTP ACTIVE deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO mfa_factors
    (
      id,
      "userId",
      type,
      status,
      "secretEncrypted",
      "createdAt",
      "enabledAt"
    )
    VALUES
    (
      'f02-mfa-second-active',
      'f02-user',
      'TOTP',
      'ACTIVE',
      'encrypted-second-active',
      NOW(),
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: segundo TOTP ACTIVE foi aceito';

  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 08. REVOKED SEM revokedAt
-- ============================================================

\echo '[08] REVOKED sem revokedAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO mfa_factors
    (
      id,
      "userId",
      type,
      status,
      "secretEncrypted",
      "createdAt"
    )
    VALUES
    (
      'f02-mfa-invalid-revoked',
      'f02-user',
      'TOTP',
      'REVOKED',
      'encrypted-revoked',
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: REVOKED sem revokedAt foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 09. SESSION VALIDA
-- ============================================================

\echo '[09] Sessao valida'

INSERT INTO sessions
(
  id,
  "userId",
  "tokenHash",
  "createdAt",
  "expiresAt",
  "lastSeenAt"
)
VALUES
(
  'f02-session-valid',
  'f02-user',
  'session-hash-valid',
  TIMESTAMP '2030-01-01 10:00:00',
  TIMESTAMP '2030-01-01 18:00:00',
  TIMESTAMP '2030-01-01 10:00:00'
);

\echo '     PASS'

-- ============================================================
-- 10. INVALID EXPIRATION
-- ============================================================

\echo '[10] expiresAt <= createdAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO sessions
    (
      id,
      "userId",
      "tokenHash",
      "createdAt",
      "expiresAt",
      "lastSeenAt"
    )
    VALUES
    (
      'f02-session-invalid-expiration',
      'f02-user',
      'session-hash-invalid-expiration',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-01 09:00:00',
      TIMESTAMP '2030-01-01 10:00:00'
    );

    RAISE EXCEPTION
      'TEST FAILURE: sessao com expiracao invalida foi aceita';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 11. revokedAt SEM reason
-- ============================================================

\echo '[11] revokedAt sem revocationReason deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO sessions
    (
      id,
      "userId",
      "tokenHash",
      "createdAt",
      "expiresAt",
      "lastSeenAt",
      "revokedAt"
    )
    VALUES
    (
      'f02-session-invalid-revoked',
      'f02-user',
      'session-hash-invalid-revoked',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-02 10:00:00',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-01 12:00:00'
    );

    RAISE EXCEPTION
      'TEST FAILURE: revokedAt sem reason foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 12. reason SEM revokedAt
-- ============================================================

\echo '[12] revocationReason sem revokedAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO sessions
    (
      id,
      "userId",
      "tokenHash",
      "createdAt",
      "expiresAt",
      "lastSeenAt",
      "revocationReason"
    )
    VALUES
    (
      'f02-session-invalid-reason',
      'f02-user',
      'session-hash-invalid-reason',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-02 10:00:00',
      TIMESTAMP '2030-01-01 10:00:00',
      'LOGOUT'
    );

    RAISE EXCEPTION
      'TEST FAILURE: reason sem revokedAt foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 13. INVALID lastSeenAt
-- ============================================================

\echo '[13] lastSeenAt anterior a createdAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO sessions
    (
      id,
      "userId",
      "tokenHash",
      "createdAt",
      "expiresAt",
      "lastSeenAt"
    )
    VALUES
    (
      'f02-session-invalid-lastseen',
      'f02-user',
      'session-hash-invalid-lastseen',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-02 10:00:00',
      TIMESTAMP '2030-01-01 09:59:00'
    );

    RAISE EXCEPTION
      'TEST FAILURE: lastSeenAt invalido foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 14. RECOVERY CODE
-- ============================================================

\echo '[14] Recovery code valido'

INSERT INTO mfa_recovery_codes
(
  id,
  "userId",
  "codeHash",
  "createdAt"
)
VALUES
(
  'f02-recovery-valid',
  'f02-user',
  'recovery-hash-valid',
  TIMESTAMP '2030-01-01 10:00:00'
);

\echo '     PASS'

-- ============================================================
-- 15. usedAt INVALIDO
-- ============================================================

\echo '[15] Recovery usedAt anterior a createdAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO mfa_recovery_codes
    (
      id,
      "userId",
      "codeHash",
      "createdAt",
      "usedAt"
    )
    VALUES
    (
      'f02-recovery-invalid-used',
      'f02-user',
      'recovery-hash-invalid-used',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-01 09:00:00'
    );

    RAISE EXCEPTION
      'TEST FAILURE: recovery usedAt invalido foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 16. revokedAt INVALIDO
-- ============================================================

\echo '[16] Recovery revokedAt anterior a createdAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO mfa_recovery_codes
    (
      id,
      "userId",
      "codeHash",
      "createdAt",
      "revokedAt"
    )
    VALUES
    (
      'f02-recovery-invalid-revoked',
      'f02-user',
      'recovery-hash-invalid-revoked',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-01 09:00:00'
    );

    RAISE EXCEPTION
      'TEST FAILURE: recovery revokedAt invalido foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 17. MFA enabledAt INVALIDO
-- ============================================================

\echo '[17] enabledAt anterior a createdAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO mfa_factors
    (
      id,
      "userId",
      type,
      status,
      "secretEncrypted",
      "createdAt",
      "enabledAt"
    )
    VALUES
    (
      'f02-mfa-invalid-enabled-time',
      'f02-user',
      'TOTP',
      'PENDING',
      'encrypted-invalid-time',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-01 09:00:00'
    );

    RAISE EXCEPTION
      'TEST FAILURE: enabledAt anterior a createdAt foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ============================================================
-- 18. MFA revokedAt INVALIDO
-- ============================================================

\echo '[18] revokedAt anterior a createdAt deve falhar'

DO $$
BEGIN
  BEGIN
    INSERT INTO mfa_factors
    (
      id,
      "userId",
      type,
      status,
      "secretEncrypted",
      "createdAt",
      "revokedAt"
    )
    VALUES
    (
      'f02-mfa-invalid-revoked-time',
      'f02-user',
      'TOTP',
      'PENDING',
      'encrypted-invalid-revoked-time',
      TIMESTAMP '2030-01-01 10:00:00',
      TIMESTAMP '2030-01-01 09:00:00'
    );

    RAISE EXCEPTION
      'TEST FAILURE: revokedAt anterior a createdAt foi aceito';

  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

\echo ''
\echo '================================================'
\echo ' FOUNDATION 02 IDENTITY CONSTRAINTS: PASS'
\echo '================================================'

ROLLBACK;

\echo ''
\echo 'ROLLBACK concluido.'
\echo 'Nenhum fixture F02 foi persistido.'
