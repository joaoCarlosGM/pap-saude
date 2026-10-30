# Exceção auditada de locks PostgreSQL — Beta1

Gate de origem: CI41053243243, etapa F04 integrated security and clinical regression gate. O scanner proíbe raw SQL por padrão e exige exceção auditada. A implementação inicial espalhava SELECTs de lock parametrizados pelo LMS; o gate recusou corretamente. A correção concentra toda execução em `src/server/courses/transaction-locks.ts`. Agregações de relatórios foram convertidas para Prisma groupBy.

## Escopo fechado

Somente16 templates de execução,15 SQLs distintos, exclusivamente SELECT id/roleId com WHERE parametrizado e FOR SHARE/FOR UPDATE. Alvos fixos: users, sessions, mfa_factors, role_assignments, role_permissions, memberships, organizations (ancestrais), courses, course_versions, course_publications, course_enrollments e course_audiences. Nenhum identificador dinâmico, fragmento SQL interpolado, concatenação, Unsafe, DML, DDL, import pg ou consulta a prontuário é permitido. Valores são strings de identidade/escopo passadas como parâmetros vinculados pelo Prisma. Booleanos internos escolhem entre dois templates fixos, nunca interpolam cláusulas SQL.

O helper não lê credenciais/segredos nem modifica linhas; mantém locks até o fim da transação do serviço. A checagem de sessão, MFA e grants continua dentro da transação. Row locks são necessários para que revogação concorrente confirme antes ou depois da escrita, nunca no intervalo entre checagem e commit. Somente Serializable não estabelece essa ordem física de commit para transações sobrepostas; substituir os locks por atualizações fictícias de contas/permissões criaria escrita e contenção global indevidas. A API Prisma tipada não oferece FOR SHARE/FOR UPDATE para esses SELECTs.

## Política verificável

`scripts/security/course-locks-policy.mjs` fixa caminho único, SHA256 integral e conjunto fechado de SQLs. O scanner permanece ativo sobre todo `src`; apenas aceita esse arquivo quando fingerprint E auditoria AST passam. A AST aceita somente templates parametrizados, valores identificadores previstos, import type e funções locais de lock. Conteúdo alterado, chamada string, concatenação, tabelas/colunas desconhecidas, DML/Unsafe e import pg falham. A mesma query em outro arquivo também falha. O teste adversarial executa o scanner real sobre fontes temporárias para comprovar essa fronteira.

Qualquer alteração futura do helper exige revisão específica do conteúdo e da política, não um glob/allowlist de diretório ou supressão do scanner. O workflow não foi alterado para ocultar essa falha; o gate original continua executando guard:sql-injection e todas as regressões. Esta é uma exceção explícita e limitada ao mecanismo de locks, não autorização de SQL arbitrário para o LMS.

Referências técnicas: [PostgreSQL16 — row-level locks](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS) e [Prisma — raw-query parameterization/injection prevention](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries#sql-injection-prevention).

Validação exigida nesta correção: guard completo, testes adversariais da política, backend LMS (incluindo revogação concorrente real e parâmetro com tentativa de injeção), TypeScript e lint. Sem migração, alteração de credenciais, MFA, IAM clínico ou acesso ao laboratório do operador. CI integral deve revalidar o SHA final; o resultado anterior não aprova esta correção.
