# MISSÃO INTEGRAL CODEX — PAP Saúde Beta 1, UX unificada + LMS real + preservação do laboratório

## Ordem executiva

Execute o trabalho **na branch existente** `feature/p0-premium-unified-rc` do repositório `joaoCarlosGM/pap-saude`. Esta missão **AUTORIZA ALTERAR CÓDIGO** nessa branch, sem refazer as Foundations, e **NÃO autoriza** alterar VPS/prod ou apagar dados locais. A saída esperada é implementação funcional e testada, não apenas novos mockups.

Leia `00-LEIA-PRIMEIRO.md` e os arquivos sob `docs/`, e inspecione seletivamente os mockups em `referencias/`. Confirme HEAD e `git status` antes de qualquer alteração, preserve alterações locais existentes e não use `git add .`.

**REGRA ABSOLUTA DE NÃO-DESTRUIÇÃO:** o usuário já utiliza `127.0.0.1:3600` com banco persistente, sete contas e MFA pessoal cadastrado. Não criar novo laboratório, não executar `local:init`, `local:seed`, `local:admin`, `migrate reset`, `db push`, `docker compose down -v`, `docker volume rm`, `docker system prune`, apagar `.local` ou gerar novas chaves. Não executar um teste destrutivo no banco 15436. Se for preciso mexer em schema, testar migration/rollback/backups em CLONE isolado primeiro. No laboratório original, somente aplicação de migration ADITIVA após backup íntegro e autorização informada do operador. Não afirmar que migrar preservará sessões sem validar compatibilidade de cookie keys/session store.

### Fase 0 — auditoria e plano econômico

- Ler `AGENTS.md`, scripts atuais, perfis locais, guards, schema Prisma, suite CI, design/tours; registrar arquivos tocáveis e riscos.
- Tomar o CI verde já existente no SHA base como baseline; não repetir suítes aprovadas sem mudança relacionada.
- Criar checklist `docs/release/pap-beta1-ux-lms/IMPLEMENTATION-STATUS.md` com PASS/FAIL/BLOCKED e artefatos por slice.
- Verificar se o curso operacional é placeholder (é na baseline) e se há domínio `courses` reaproveitável antes de introduzir Prisma novo.
- Não confundir mocks de dados e UI. Resolver conflitos de escopo com regras do `00-LEIA-PRIMEIRO.md`.

### Fase 1 — design system e navegação

- Adaptar componentes visuais compartilhados, sem trazer código de `DemoProvider` para clínica.
- Finalizar sidebar para Vitrine, clínica e HEALTH_UNIT_ADMIN, foto/identidade, agrupamento aprovado, selo Cursos `Novo` baseado em dados reais (demo sintético), botão Ajuda/Tour/TI.
- Adicionar banner **abstrato sem personagens** por rota, com texto DOM acessível e imagem decorativa; responsividade; sem dupla barra ativa ou scroll quebrado.
- Preservar 100% dos KPIs/fórmulas/dashboard operacional e demo, alterando SOMENTE capa/banners e shell.
- UI admin global verde-petróleo claro/escuro; hierarchy Rede → Município → Unidade → profissionais/responsáveis; métricas já existentes preservadas.
- UI PAP_MANAGER orientada a ações, sem cards de dashboard de métricas; papel só pode executar grants existentes, novos grants devem ser auditados e testados.

### Fase 2 — curso compartilhado e autoria MANAGER

- Implementar componentes `CourseCard`, `CourseCatalog`, `CourseBanner`, `CourseProgress`, `CourseDeadline`, `CourseEmptyState` com interfaces de apresentação tipadas, data providers separados (demo versus API real).
- Implementar domínio LMS incremental via migrations Prisma ADITIVAS: `Course`, `CourseVersion`, `CourseModule`, `CourseLesson`, `CourseAsset`, `CourseAssessment`, `CourseQuestion`, `CoursePublication`, `CourseAudience`, `CourseAssignment`, `CourseEnrollment`, `CourseProgress`, `CourseAttempt`, `CourseCertificate` (último somente se emissão validada; senão schema/placeholder reservado). Adequar ao padrão real de IDs/Prisma existente. Reuse modelos existentes quando apropriado.
- Implementar workbench `PAP_MANAGER` para rascunho, editor visual blocado HTML5, módulos/aulas, atividades, avaliação, prazos de atribuição e versionamento; publicação + seleção de municípios/UBS/hospitais. PAP_MANAGER pode editar cursos; HEALTH_UNIT_ADMIN só distribui/acompanha.
- **HTML seguro**: preferir JSON declarativo de blocos tipados que vira HTML5 no renderer. NÃO hospedar/executar HTML/JS arbitrário no mesmo origin do PAP Saúde. Para pacotes HTML externos, oferecer apenas importação sanitizada ou deixar upload de scripts como BLOCKED/FASE FUTURA; ver `docs/03-LMS-ARQUITETURA.md`.

### Fase 3 — atribuição pela UBS e aprendizagem

- HEALTH_UNIT_ADMIN no MESMO shell do profissional: aba Cursos com ações extras `Liberados para unidade`, `Atribuir à equipe`, `Atribuídos`, `Pendências`, sem mini-PAP Admin.
- Seleção de todos ou alguns profissionais vinculados/ativos àquela unidade; obrigatoriedade e prazo por atribuição; transação idempotente para evitar matrícula duplicada; estado/auditoria real. Não habilitar atuação sobre outras UBS.
- Se um curso for liberado ao município, aplicar elegibilidade às suas UBS autorizadas, sem matrícula automática em cada profissional; necessidade de ato do gestor de unidade.
- Profissional recebe notificação real da nova atribuição, abre página de aprendizagem `/aprender/[enrollmentId]`, continua da última atividade salva, responde questões, conclui; servidor verifica sequência/requisitos, não confia no percentual client-side.
- Definir semântica separada `deadlineAt` (concluir), `certificateValidUntil` (recertificação) e `archivedAt` (publicação). Atividade vencida não pode gerar certificado válido sem regra de prorrogação aprovada.

### Fase 4 — segurança, testes e homologação

- Testes para sete perfis existentes sem ler/expor as senhas do operador; contas novas em DB DESCARTÁVEL nos testes automatizados.
- Testar IDOR/troca tenant, permissões manager/unit/profissional, revogação, acesso direto API, XSS de HTML, validade de assinatura/versions, idempotência, progresso após F5 e após reinício do app, prazos, notification badges, dark/light, reduced motion e WCAG.
- E2E por slices; antes do gate completo rodar TypeScript, lint/build e testes direcionados de cada domínio; CI completo UMA vez no SHA candidato. Registrar o estado real de todos os gates; não omitir falhas.
- Banco real 15436: **não migrar sem backup íntegro e aceite do operador**. Fornecer passos curtos para ele validar `/cursos` com as MESMAS contas/MFA existentes após deploy apenas do código no checkout atual.

### Fase 5 — commit/entrega

Commits seletivos por slice, cada commit com arquivos exatos, testes relevantes e push à feature `feature/p0-premium-unified-rc`; não usar `git add .`. Se checkout local do operador estiver com mudanças não commitadas, não sobrescrever: reportar e propor reconciliação não destrutiva. Após push, confirmar CI do HEAD. Atualizar `docs/release/pap-beta1-ux-lms/IMPLEMENTATION-STATUS.md` com SHA, tabelas de PASS/FAIL/BLOCKED, migrations, auditoria e plano de rollback.

**STOP** após entrega do candidato da mesma branch e instruções seguras de homologação local. Sem SSH/VPS, sem `prod`, sem publicação Resend, sem deploy de produção.

## Critérios de GO (TODOS obrigatórios)

1. Continuidade de conta: mesmas sete contas/senhas/MFA/UIDs, mesmo banco e volume, sem reset, confirmado por testes não sensíveis antes/depois.
2. UI parity: sidebar, banners sem pessoas, fotoperfil, ajuda/tour, cards de paciente, atendimento e cursos visualmente coesos; dados/guards isolados.
3. Admin: global teal claro/escuro, Município→UBS/Hospital→membros/responsáveis; PAP_MANAGER sem dashboard de métricas, com permissões corretas.
4. Cursos: manager edita/publica; unidade seleciona públicos; profissional recebe, estuda e salva no PostgreSQL; prazos, avaliações, auditoria, versionamento.
5. CI verde no novo SHA + backup/restore em DB isolada + documentação de etapa manual do operador.
6. MEOWS assistencial, segurança e KPIs originais sem regressões.