# Motor de Cursos HTML5 — arquitetura detalhada, banco, APIs, edição e aluno

## Decisão: conteúdo HTML visual seguro, não execução irrestrita de HTML arbitrário

O usuário pediu animações, textos e atividades em HTML. Na Beta 1, implementar **blocos tipados em JSON** com renderer React/HTML5 e animações CSS controladas (`prefers-reduced-motion`). O manager usa editor visual, sem editar JavaScript. Blocos: `heading`, `text`, `image`, `callout`, `steps`, `accordion`, `timeline`, `videoExternalAllowlisted` (opcional), `multipleChoice`, `trueFalse`, `matching` (opcional), `checkpoint`. Conteúdo textual renderizado como texto escapado; rich text somente sanitizado estritamente.

**Importação de ZIP HTML + JavaScript arbitrário** não é requisito para ativar na Beta 1. Se implementada posteriormente: separar domínio/origin, iframe com `sandbox` restritivo sem `allow-same-origin` combinado a `allow-scripts`, CSP rígida, nenhum acesso a cookies/segredos/parent, canal `postMessage` com schema, source/origin e nonce validados; backend continua único avaliador de progresso. Nunca executar scripts enviados pelo manager dentro do origin autenticado PAP Saúde.

## Modelo sugerido — adaptar ao Prisma real e às migrations históricas (somente novas migrations)

- `Course`: id, slug, creatorUserId, title, description, category, thumbnailAssetId?, status(DRAFT/PUBLISHED/ARCHIVED), createdAt/updatedAt; não carregar user secrets no catálogo.
- `CourseVersion`: id, courseId, versionNo, schemaVersion, publishedAt?, immutableContentHash, estimatedMinutes, certificationPolicyJson?; **publicada é imutável**; nova edição gera rascunho nova versão; alunos iniciados continuam versão anterior até migração explícita.
- `CourseModule`: id, courseVersionId, title, sortOrder; cascade apenas para rascunhos não publicados.
- `CourseLesson`: id, moduleId, title, sortOrder, contentBlocks JSON versionado, estimatedMinutes; sem JS livre.
- `CourseAsset`: id, checksum, MIME real, sizeBytes, storageKey (não URL externa arbitrária), attribution/license, createdBy; autorização de leitura conforme curso publicado/atribuído.
- `CourseAssessment`: id, versionId, passingScore?, maxAttempts?, shufflePolicy?, requiredForCompletion; pontuação/progresso apenas servidor.
- `CourseQuestion`: id, assessmentId, questionType, sanitizedPrompt, options JSON, correctAnswer **SOMENTE SERVIDOR**, feedback; não expor gabarito no endpoint do aluno.
- `CoursePublication`: id, courseVersionId, publishedBy, publishedAt, revokedAt?; só manager/editor autorizado pode publicar.
- `CourseAudience`: id, publicationId, organizationId, scope (MUNICIPALITY/HEALTH_UNIT/HOSPITAL), status (AVAILABLE/REVOKED), releasedBy, releasedAt; elegibilidade por ancestry real, sem acesso a unidades de outro município.
- `CourseAssignment`: id, publicationId, organizationId (UBS), professionalUserId, assignedBy, obligation (REQUIRED/RECOMMENDED/OPTIONAL), deadlineAt?, notifiedAt?, status; UNIQUE(publicationId,organizationId,professionalUserId) ou idempotency key, não duplicar em reenvio.
- `CourseEnrollment`: id, assignmentId, learnerUserId, courseVersionId, startedAt, completedAt?, status (NOT_STARTED/IN_PROGRESS/COMPLETED/OVERDUE/REVOKED), lastLessonId?, percentCompletions (projeção derivada), createdAt/updatedAt; status atrasado calculado a partir do deadline, não contador arbitrário.
- `CourseProgress`: enrollmentId + lessonId UNIQUE, completedAt?, checkpointSubmissionId?, lastVisitedAt; adicionar `version` para concorrência otimista/ETag.
- `CourseAttempt`: id, enrollmentId, assessmentId, submittedAt, scoreValidated, passed, attemptNo, answersDigest/serverResult; sem salvar conteúdo clínico/PHI em respostas de treinamento.
- `CourseCertificate` (opcional para beta): enrollmentId, certificateSerial, issuedAt, validUntil, revokedAt, policyVersion, verifierToken; **não emitir certificado se regras de certificação não estiverem aprovadas**, usar somente “curso concluído”. Não criar documento de certificação com validade falsa.
- `CourseAuditEvent`: reutilizar o audit ledger existente, não duplicar sistema quando suficiente.

### Índices/constraints essenciais

- UNIQUE `(courseId, versionNo)`; `(courseVersionId, sortOrder)`; `(enrollmentId, lessonId)`; `(publicationId, organizationId, professionalUserId)`.
- Índices por `(organizationId,status,deadlineAt)`, `(learnerUserId,status)`, `(publicationId,organizationId)`; `updatedAt` para paginação determinística.
- Chaves FKs e policies consistentes com o modelo de organizações/filiação, sem mapeamentos de instituição somente no client.
- Soft archive de publicações ou revogação explícita em vez de delete cascata sobre progresso histórico.
- Migrações aditivas, verificadas por `migrate deploy` em DB descartável; não editar migrations antigas.

## API (proposta, nomes podem adaptar à convenção existente)

| Método / endpoint | Papel/escopo | Contrato |
|---|---|---|
| GET `/api/courses/catalog` | sessão MFA e escopo | lista versões visíveis; sem expor perguntas corretas |
| POST `/api/courses/drafts` | editor MANAGER | cria rascunho, retorno id; rate-limit, audit |
| PATCH `/api/courses/drafts/[id]` | editor dono/grant | edição validada, optimistic lock/If-Match |
| PUT `/api/courses/drafts/[id]/modules` | editor | reordenação validada/versionada |
| POST `/api/courses/[id]/publish` | course.publish | congela versão, idempotente, audit |
| POST `/api/courses/publications/[id]/release` | MANAGER | municípios/UBS/hospitais autorizados; transação |
| GET `/api/courses/unit/available` | unit manager | somente publicações elegíveis à UBS efetiva |
| POST `/api/courses/unit/assign` | unit manager | membros ativos mesma UBS; idempotente; deadline; audit e notify |
| GET `/api/courses/me` | profissional | matrículas do próprio usuário |
| GET `/api/courses/enrollments/[id]` | aluno dono | conteúdo versionado, progresso sem respostas corretas |
| POST `/api/courses/enrollments/[id]/progress` | aluno dono | completar etapa validada com idempotency key e versão |
| POST `/api/courses/enrollments/[id]/attempts` | aluno dono | avalia no backend; contabiliza tentativas válidas |
| GET `/api/courses/unit/progress` | manager UBS | progressos de atribuições somente UBS autorizada, mínimo necessário |

**Não expor tudo em `/api/admin` para facilitar.** Guards vinculam session/MFA/grants/orgId em cada handler. GET não retorna secret keys nem corpora clínicos.

## Publicação e distribuição — invariantes

1. Publicar congela `CourseVersion` imutável e `contentHash`; edição posterior abre nova versão. Modificações de prazos para usuários matriculados exigem ato explícito, notificação e auditoria.
2. `CoursePublication` cria oferta institucional. `CourseAudience` Município permite distribuição para UBS descendentes elegíveis, mas a atribuição ao profissional só ocorre por `HEALTH_UNIT_ADMIN` autorizado daquela UBS.
3. `CourseAssignment` cria exatamente uma matrícula por destinatário/curso/UBS e pode ser repetido sem duplicar; reenviar deve retornar “já atribuído”.
4. Atribuição exige profissional ATIVO e vínculo ATIVO naquela UBS. Revogação de vínculo impede continuidade futura conforme política, sem apagar histórico.
5. `deadlineAt` usado para obrigatoriedade e atraso; `certificateValidUntil` separado. Horário deve ser armazenado UTC, mostrado com fuso do operador. Vencimento de prazo não deleta progresso e não renova automaticamente certificação.
6. Um curso `ARCHIVED` não está disponível para novas matrículas; matrículas prévias mantém histórico e política explícita.
7. Um novo curso aparece no badge de novidade após publicação e liberação/atribuição elegível, conforme status de leitura; `Novo` não é numérico fake.

## Player de aprendizagem

Rota dedicada `/aprender/[enrollmentId]`: topo título, módulo, progresso, Ajuda, botão Sair; sidebar módulos/aulas; área central com HTML5 responsivo, animações CSS opcionais, imagens, exercícios; rodapé Anterior/Próximo + “Progresso salvo”. Não usar pontuação clínica MEOWS nem informações do prontuário como material pré-carregado.

- `course:open` confirma autorização e versão; registra início no banco com operação idempotente.
- `lesson:visit` pode salvar ponto de retomada, sem marcar conclusão por tempo de janela aberto.
- `lesson:complete` valida leitura + checkpoints obrigatórios com regras do servidor; API responde progresso recomputado; tentativas repetidas não duplicam.
- `assessment:submit` valida answers no servidor e aplica política de tentativa/nota; zero lógica decisória no client.
- `course:complete` conclui só se todos módulos/atividades obrigatórias e avaliação cumpridas. Não confiar em `progress=100` enviado por browser.
- Autosave em transições + debounce moderado; `visibilitychange`/`pagehide` são best effort, não justificam status falso; resposta perdida recuperada por consulta de estado.
- `F5`, novo login, stop/start do Next e do DB devem manter mesma matrícula/posição/progresso.
- Curso sem páginas/sem dados deve renderizar estado vazio, nunca botão funcional falso.

## UX e prazos nos cards

- Thumbnail 16:9, selo categoria, `Obrigatório/Recomendado/Opcional`, nome, duração, aulas, progresso real, deadline, validade certificação se aplicável, CTA.
- Prazos: `>30 dias` neutro, `7–30 dias` aviso, `0–7 dias` alto destaque, passado `Em atraso`; limiares configuráveis no produto e ajustados por designer; não depender só de cor (ícone/texto).
- Percentual derivado do conjunto válido de atividades obrigatórias, não da duração estimada em vídeo. Mostrar `última sincronização` e erros.
- Unidades sem curso: `Nenhum curso liberado/atribuído`; sem simular cursos. Vitrine usa 6 fixtures sintéticas coerentes.

## Interface MANAGER

Passo 1 Infos: título, resumo, categoria, duração estimada, thumbnail, nível, idiomas. Passo 2 Aulas: módulos, ordem, editor de blocos, imagens, atividades, prévia. Passo 3 Avaliação: itens/limite/tentativas; obrigatoriedade, deadline default e certificação se aprovada. Passo 4 Público: selecionar municípios/UBS elegíveis e validar concessões; não matrícula diretamente. Passo 5 Revisão/publicação: resumo, avisos de segurança, diffs, confirmação, auditoria. Salvar rascunho a qualquer passo sem perder alterações. Publicar exige que todas as validações passem.

## Segurança de conteúdo e dados

- Usar schemas Zod ou validador adotado no repo; limites tamanho de payload/nível de aninhamento/arquivos; sanitização HTML/URLs; bloquear `javascript:`, `data:` perigosos, scripts, iframes externos livres, style injection, event handlers, SVG ativo e requests cross-origin não autorizados.
- Upload de JPG/PNG/WebP somente se necessário e verificado por assinatura MIME e dimensão; arquivos privados no storage persistente com nomes/keys aleatórios e checksum, sem blobs no DB sem projeto aprovado. Conteúdo de referência do mockup não pode ser convertido em biblioteca clínica real por mágica.
- Ensaio com payload XSS e adversarial, revogação, sessão expirada, logout/MFA incompleto, tentativa de GET de gabarito, escalada para outra UBS.
