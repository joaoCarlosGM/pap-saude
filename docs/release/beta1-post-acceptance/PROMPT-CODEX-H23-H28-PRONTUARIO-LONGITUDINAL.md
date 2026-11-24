# MISSÃO CODEX — H23–H28 | Prontuário longitudinal da Vitrine Premium
**Executar somente após comando explícito do operador.** O arquivo é o contrato da próxima implementação, não uma ordem automática para qualquer agente ao abrir o projeto.

## 0. Repositório, baseline e ambiente
- Repositório: `joaoCarlosGM/pap-saude`.
- Branch de referência onde a especificação está publicada: `feature/beta1-post-acceptance-ux-rc`.
- SHA auditado antes desta documentação: `2ec1f7c52efdc53119062d437c97ae2e8ed8b1c4`; **revalidar HEAD remoto** porque novos commits desta documentação foram adicionados posteriormente.
- Para implementar, **crie uma nova branch** a partir do HEAD confirmado: `feature/beta1-longitudinal-record-h23-h28-rc` (ou outro nome isolado se já existir).
- Projeto: Vitrine Premium demonstrativa; testes em fixture privada com PostgreSQL exclusivo. **Não alterar código operacional ou VPS.**

## 1. Leitura obrigatória — ANTES de editar
1. `AGENTS.md` e documentação Next.js instalada em `node_modules/next/dist/docs/`.
2. `docs/release/beta1-post-acceptance/REQUISITOS-H23-H28-PRONTUARIO-LONGITUDINAL.md` integralmente.
3. `docs/release/beta1-post-acceptance/CHECKLIST-H23-H28-PRONTUARIO-LONGITUDINAL.md` integralmente.
4. `docs/release/beta1-post-acceptance/RELATORIO.md`, `HOMOLOGACAO-WSL.md`, `HOMOLOGACAO-MOBILE.md`, documentação H01–H22 e últimos commits de H18–H22.
5. Código da Vitrine: `types/{paciente,registration,atendimento}.ts`; `lib/demo/{data,fixtures}.ts`; `lib/{registration-record,demo-agenda}.ts`; `components/demo/{DemoProvider,CardServiceContext}.tsx`; `components/pacientes/{PatientTabs,PatientSummary,PatientExams,PatientVaccines,PatientMedications,PatientTimeline,PatientEvolution,PatientPreviousNotes,PatientDocuments}.tsx`; `components/registro/{RegistrationWizard,ClinicalHistory,SoapNotes}.tsx`; `components/agenda/AgendaPanel.tsx`; `scripts/private-review/{registry-store,registry-api,documents}.ts`; `scripts/pap-id/review-lab.mts`; fixture e testes atuais.
6. Confirmar `git status --short`, branch e SHA, nenhum worktree/arquivo de usuário sobrescrito.

### Questão principal a resolver
As abas do prontuário **mostram** registros ilustrativos, mas nem sempre permitem **criar/atualizar**. Pior: `saveDemo` sobrescreve arrays de medicamentos/alergias/comorbidades com os dados da última consulta e o `DemoProvider` usa estado em memória. A missão deve entregar CRUD demonstrativo coerente, **histórico preservado, persistência verificável e Timeline integrada**, sem confundir “não informado” com exclusão.

## 2. Plano de implementação obrigatório
**G0 — Inventário/contratos.** Comparar estado de cada aba, descrever fonte atual, encontrar serviço privado apropriado, analisar autorização por paciente, API e contexto; desenhar schema compatível e plano de reconciliação sem sobrescrever a fixture.

**S1 — Modelo e repositório persistente.** Criar contratos tipados para exame, solicitação, resultado, vacinação, medicação, alergia, comorbidade, contatos e eventos. IDs estáveis, fonte, autor sintético, datas de ocorrência e registro, status explícitos, versionamento/retificação e idempotência. Adaptador para PostgreSQL **apenas no laboratório isolado privado**, usando os controles existentes de `review-lab` (sessão, Origin, CSRF/escopo, paciente, token). Sem endpoints públicos, sem migrations históricas operacionais. Testar persistência antes do UI. Não conectar bancos/repositórios reais. Avaliar migração de arrays simples e fixture sem criar história fictícia.

**S2 — H23 Exames.** Criar solicitação; registrar resultado; atualizar status; adicionar componentes numéricos com unidades e método fornecidos; associar PDF existente ao mesmo `patientId`; retificar com histórico; navegar sem nova consulta. Não inventar “normal” ou “alterado”. Dados da fixture antigos ficam com proveniência ilustrativa.

**S3 — H24 Vacinação.** Registrar dose, situação, comprovante opcional, local/lote/autor quando disponíveis, retificar status e integrar com agenda sem presumir que agendamento significa aplicação. Preservar histórico.

**S4 — H25 Cadastro.** Editar telefone/endereço/CNS sintéticos em Resumo e retificação controlada dos campos identitários sem quebrar PAP-ID, CPF vinculado ou a paciente. Proteger com confirmação, histórico, validação e impacto nas representações. Não fabricar CNS/CPF válidos reais.

**S5 — H26/H27 Reconciliação.** Adicionar, revisar, encerrar/suspender medicamentos e alergias/comorbidades no prontuário, mantendo autor, data e origem. Corrigir prioritariamente `saveDemo` para que nova consulta **não apague** valores prévios quando os campos vierem em branco. Não usar `med-\${i}` como identificador persistente, nem comparar ausência com “negação” de alergia. Se UI da consulta coleta estado novo, usar patch/intenção explícita e registrar alterações; não fazer replace silencioso.

**S6 — H28 Timeline.** Unificar eventos das consultas, SOAP, exames, vacinas, medicação, alergias, cadastro, documentos e agenda. Eventos de origem legada vêm com marcação clara; retificações não removem versões; filtros, context links, ordenação por data; acesso cross-patient proibido. A Timeline deve refletir apenas fatos registrados, não decisões clínicas inferidas.

**S7 — UX integrada.** Preservar as nove abas e tema da Vitrine. Ações curtas e modais compactos, formulários com rascunho/salvar/cancelar/dirty guard, responsividade 320–1440px, teclado Android, acessibilidade (foco, Escape, sem overflow), dark/light/motion, textos breves e consistentes. Não criar múltiplas barras de ferramentas invasivas nem repetir avisos de homologação.

**S8 — Testes, segurança e handoff.** Executar TODOS os itens do checklist H23–H28 e regressões H18–H22; Testes unitários, integração PostgreSQL isolado, Playwright desktop/mobile, anexos e PAP-ID, TypeScript, lint, build, boundary standalone, segurança de sessão e vínculo por paciente. Build bloqueado = BLOCKED com log, nunca PASS presumido. Teste físico Android/iPhone só PASS se realmente executado.

## 3. Contratos não negociáveis
- **Não editar** `prod`, `PROD`, `develop`; nenhum merge/PR para produção ou deploy. Não tocar VPS, DNS, Nginx, GHCR, contas clínicas, IAM/MFA, LMS, banco operacional `127.0.0.1:15436`, UI atual na porta `3600`, containers/volumes existentes.
- Não alterar arquivos de migracões operacionais nem usar `DATABASE_URL` real. Perfil review próprio com Docker Compose e porta exclusiva. Não executar `docker prune`/`git reset --hard`/`git clean -fd`.
- Preservar PAP-ID (QR, cartão, Documentos), PDFs, Protocolos, cinco etapas do Registro, Agenda H22, SOAP H20, proteções de clínicas, e animações da referência VPS. Nada de prescrição, diagnóstico automático, automação de decisões sobre exame/vacina ou alertas clínicos sem regras aprovadas.
- Respeitar LGPD: somente paciente fictício na homologação, nenhum CPF/CNS real nem tokens/cartões/arquivos médicos privados versionados; PDFs de exames sob autorização da mesma paciente. Nunca alegar equivalência entre acesso público e autorização de redistribuição.
- Dados de demonstração **não se tornam dados operacionais** nem são migrados para produção pela missão. Quaisquer caminhos de migração futura devem ficar só em documentação.

## 4. Critério de aceitação (evidências mensuráveis)
- H23: pedido + resultado + retificação + PDF privado vinculado do mesmo paciente, persistente.
- H24: dose aplicada/agendada/pendente + histórico, persistente e sem alertas falsos.
- H25: editar contato/endereço e retificar identidade com histórico e sem quebrar cartão.
- H26: 2 medicações anteriores → nova consulta sem medicações → ainda 2, sem perda, mais suspensões.
- H27: alergia/condição não desaparece com consulta não informativa, revisões preservadas.
- H28: eventos vinculados aparecem após refresh/restart, sem duplicação nem vazamento de A→B.
- Todos os fluxos: mesma identidade sintética, sessão privada, dados não reais, mobile/desktop navegáveis, cinco etapas Registro intactas.

## 5. Entregáveis
Criar `docs/release/beta1-longitudinal-h23-h28/` com:
- `RELATORIO.md` — baseline, HEAD final, arquivos alterados, H23–H28 status item por item, decisões de arquitetura, limitações.
- `MATRIZ-DADOS-E-ORIGENS.md` — entity → campo → fonte → validação → mutação → versionamento → armazenamento → exibição.
- `MATRIZ-PERSISTENCIA.md` — local da fonte, migrations **isoladas** se existirem, testes refresh/restart/DB e reconciliação dos legados.
- `CHECKLIST-RESULTADOS.md` — status PASS/FAIL/BLOCKED/NOT RUN e evidências.
- `HOMOLOGACAO-WSL.md` — clone da nova branch em pasta separada, `npm ci`, profile create único, status/start/serve, testes, sem tocar no ambiente anterior.
- `HOMOLOGACAO-MOBILE.md` — HTTPS privado, IP/bind, câmera e UX, sem expor fixture a público.
- `SEGURANCA-E-DEPLOY-FUTURO.md` — boundary, IAM, LGPD, riscos, NO-GO se gates falham.
- `evidence/` — screenshots sete larguras, logs sanitizados, resultados testes.
- Commit/push **somente** da nova branch e entregar SHA remoto confirmado. **Não fazer merge, deploy ou publicar a Vitrine.**

### STOP
Após push, apresentar relatório, link, instruções de homologação e permanecer sem deploy até aceite explícito do operador.
