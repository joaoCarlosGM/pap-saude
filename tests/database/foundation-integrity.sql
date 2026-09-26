\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '================================================'
\echo ' PAP SAUDE - FOUNDATION DATABASE INTEGRITY TEST'
\echo '================================================'

-- ========================================================
-- 01. ORGANIZATIONS
-- ========================================================

\echo '[01] Criando organizacoes'

INSERT INTO organizations
(id, name, type, "createdAt", "updatedAt")
VALUES
('org-pap-test', 'PAP Test', 'PAP', NOW(), NOW()),
('ubs-a-test', 'UBS A Test', 'HEALTH_UNIT', NOW(), NOW()),
('ubs-b-test', 'UBS B Test', 'HEALTH_UNIT', NOW(), NOW());

\echo '     PASS'

-- ========================================================
-- 02. USER
-- ========================================================

\echo '[02] Criando usuario'

INSERT INTO users
(id, email, "displayName", "isActive", "createdAt", "updatedAt")
VALUES
(
'user-test',
'foundation-test@papsaude.local',
'Foundation Test',
TRUE,
NOW(),
NOW()
);

\echo '     PASS'

-- ========================================================
-- 03. ROLE
-- ========================================================

\echo '[03] Criando role'

INSERT INTO roles
(id, key, name, system, "createdAt", "updatedAt")
VALUES
(
'role-test',
'FOUNDATION_TEST',
'Foundation Test',
FALSE,
NOW(),
NOW()
);

\echo '     PASS'

-- ========================================================
-- 04. ROLE ASSIGNMENT VÁLIDO
-- ========================================================

\echo '[04] RBAC com Organization valida'

INSERT INTO role_assignments
(id, "userId", "roleId", "organizationId")
VALUES
(
'ra-valid',
'user-test',
'role-test',
'ubs-a-test'
);

\echo '     PASS'

-- ========================================================
-- 05. ROLE ASSIGNMENT INVÁLIDO
-- ========================================================

\echo '[05] RBAC rejeita Organization inexistente'

DO $$
BEGIN
  BEGIN

    INSERT INTO role_assignments
    (id, "userId", "roleId", "organizationId")
    VALUES
    (
      'ra-invalid',
      'user-test',
      'role-test',
      'org-inexistente'
    );

    RAISE EXCEPTION
      'TEST FAILURE: FK de Organization nao foi aplicada';

  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ========================================================
-- 06. PATIENT
-- ========================================================

\echo '[06] Criando paciente'

INSERT INTO patients
(
id,
cpf,
cns,
"fullName",
"birthDate",
"createdAt",
"updatedAt"
)
VALUES
(
'patient-test',
'99999999991',
'999999999999991',
'Paciente Foundation',
TIMESTAMP '2000-01-01 00:00:00',
NOW(),
NOW()
);

\echo '     PASS'

-- ========================================================
-- 07. CPF UNIQUE
-- ========================================================

\echo '[07] CPF duplicado deve falhar'

DO $$
BEGIN
  BEGIN

    INSERT INTO patients
    (
      id,
      cpf,
      "fullName",
      "birthDate",
      "createdAt",
      "updatedAt"
    )
    VALUES
    (
      'patient-cpf-duplicate',
      '99999999991',
      'CPF Duplicate',
      TIMESTAMP '2001-01-01 00:00:00',
      NOW(),
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: CPF duplicado foi aceito';

  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ========================================================
-- 08. CNS UNIQUE
-- ========================================================

\echo '[08] CNS duplicado deve falhar'

DO $$
BEGIN
  BEGIN

    INSERT INTO patients
    (
      id,
      cns,
      "fullName",
      "birthDate",
      "createdAt",
      "updatedAt"
    )
    VALUES
    (
      'patient-cns-duplicate',
      '999999999999991',
      'CNS Duplicate',
      TIMESTAMP '2001-01-01 00:00:00',
      NOW(),
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: CNS duplicado foi aceito';

  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ========================================================
-- 09. PATIENT ↔ UBS
-- ========================================================

\echo '[09] Paciente pode estar vinculado a duas UBS'

INSERT INTO patient_organizations
(
id,
"patientId",
"organizationId",
"medicalRecordNo",
"isPrimary",
"linkedAt"
)
VALUES
(
'po-a',
'patient-test',
'ubs-a-test',
'TEST-A-001',
TRUE,
NOW()
),
(
'po-b',
'patient-test',
'ubs-b-test',
'TEST-B-001',
FALSE,
NOW()
);

\echo '     PASS'

-- ========================================================
-- 10. DUPLICATE PATIENT ↔ ORGANIZATION
-- ========================================================

\echo '[10] Vinculo paciente/UBS duplicado deve falhar'

DO $$
BEGIN
  BEGIN

    INSERT INTO patient_organizations
    (
      id,
      "patientId",
      "organizationId",
      "linkedAt"
    )
    VALUES
    (
      'po-duplicate',
      'patient-test',
      'ubs-a-test',
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: vinculo duplicado foi aceito';

  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ========================================================
-- 11. ENCOUNTER
-- ========================================================

\echo '[11] Criando atendimento'

INSERT INTO encounters
(
id,
"patientId",
"organizationId",
status,
"occurredAt",
"createdAt",
"updatedAt"
)
VALUES
(
'encounter-test',
'patient-test',
'ubs-a-test',
'DRAFT',
NOW(),
NOW(),
NOW()
);

\echo '     PASS'

-- ========================================================
-- 12. CLINICAL EVALUATION #1
-- ========================================================

\echo '[12] Criando MEOWS #1'

INSERT INTO clinical_evaluations
(
id,
"patientId",
"encounterId",
"meowsScore",
"alertLevel",
"evaluatedAt"
)
VALUES
(
'ce-1',
'patient-test',
'encounter-test',
1,
'GREEN',
NOW()
);

\echo '     PASS'

-- ========================================================
-- 13. CLINICAL EVALUATION #2
-- ========================================================

\echo '[13] Segundo MEOWS no mesmo atendimento'

INSERT INTO clinical_evaluations
(
id,
"patientId",
"encounterId",
"meowsScore",
"alertLevel",
"evaluatedAt"
)
VALUES
(
'ce-2',
'patient-test',
'encounter-test',
3,
'YELLOW',
NOW()
);

\echo '     PASS'

-- ========================================================
-- 14. RNDS INTEGRATION
-- ========================================================

\echo '[14] Criando integracao RNDS para UBS A'

INSERT INTO rnds_integrations
(
id,
"healthUnitId",
environment,
status,
"createdAt",
"updatedAt"
)
VALUES
(
'rnds-a',
'ubs-a-test',
'SANDBOX',
'NOT_REQUESTED',
NOW(),
NOW()
);

\echo '     PASS'

-- ========================================================
-- 15. RNDS UNIQUE PER HEALTH UNIT
-- ========================================================

\echo '[15] Segunda integracao RNDS na mesma UBS deve falhar'

DO $$
BEGIN
  BEGIN

    INSERT INTO rnds_integrations
    (
      id,
      "healthUnitId",
      environment,
      status,
      "createdAt",
      "updatedAt"
    )
    VALUES
    (
      'rnds-a-duplicate',
      'ubs-a-test',
      'SANDBOX',
      'NOT_REQUESTED',
      NOW(),
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: segunda integracao RNDS foi aceita';

  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ========================================================
-- 16. TRANSMISSION
-- ========================================================

\echo '[16] Criando transmission ledger'

INSERT INTO interoperability_transmissions
(
id,
"rndsIntegrationId",
"resourceType",
"resourceId",
"correlationId",
status,
attempt,
"requestedAt",
"createdAt",
"updatedAt"
)
VALUES
(
'tx-1',
'rnds-a',
'Patient',
'patient-test',
'corr-foundation-001',
'QUEUED',
0,
NOW(),
NOW(),
NOW()
);

\echo '     PASS'

-- ========================================================
-- 17. CORRELATION ID UNIQUE
-- ========================================================

\echo '[17] correlationId duplicado deve falhar'

DO $$
BEGIN
  BEGIN

    INSERT INTO interoperability_transmissions
    (
      id,
      "rndsIntegrationId",
      "resourceType",
      "resourceId",
      "correlationId",
      status,
      attempt,
      "requestedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES
    (
      'tx-2',
      'rnds-a',
      'Patient',
      'patient-test',
      'corr-foundation-001',
      'QUEUED',
      0,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE EXCEPTION
      'TEST FAILURE: correlationId duplicado foi aceito';

  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END $$;

\echo '     PASS'

-- ========================================================
-- 18. AUDIT
-- ========================================================

\echo '[18] AuditEvent com correlationId'

INSERT INTO audit_events
(
id,
"actorUserId",
"organizationId",
action,
"resourceType",
"resourceId",
outcome,
"correlationId",
"occurredAt"
)
VALUES
(
'audit-1',
'user-test',
'ubs-a-test',
'FOUNDATION_TEST',
'Patient',
'patient-test',
'SUCCESS',
'corr-foundation-001',
NOW()
);

\echo '     PASS'

\echo ''
\echo '================================================'
\echo ' TODOS OS TESTES ESTRUTURAIS PASSARAM'
\echo '================================================'

ROLLBACK;

\echo ''
\echo 'ROLLBACK concluido.'
\echo 'Nenhum fixture foi persistido.'
