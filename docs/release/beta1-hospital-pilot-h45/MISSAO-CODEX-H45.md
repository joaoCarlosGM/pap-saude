# H45 — PAP Saúde Beta 1 Hospital: reaproveitar interface Premium, conectar backend clínico, integrar PAP Admin
**27/11/2026 — branch de preparação `feature/beta1-hospital-pilot-readiness-h45-rc`**  
**Prazo de planejamento:** apresentação em 27/11; instalação-piloto pretendida para 30/11. **Nenhum GO clínico automático.**

## Instrução principal ao Codex
NÃO refazer a UI. Tratar os componentes Premium H29–H44 e os concepts aprovados como VIEW compartilhada. Implementar **dois modos mutuamente isolados** usando providers/ports/adapters tipados no limite da camada de dados; nada de troca global de `DATABASE_URL` ou de ativação do DemoProvider com credenciais operacionais. **Preservar a Vitrine como demonstração com fixtures sintéticas**; não renomear ou reutilizar as URLs de endpoints de simulação para dados clínicos.

**Auditoria confirmada:** `src/features/vitrine-premium/components/demo/DemoProvider.tsx` ainda contém `initialDemo`, `saveDemo` e artefatos do laboratório; `/api/vitrine/[section]` usa `demoContent` e `simulateDemoRegistration`. Backend operacional separado existe em `src/server/http/clinical-api.ts` + `/api/clinical/[[...path]]` e em `/api/clinical/registrations`. Este último exige sessão, MFA operacional, organizationId, idempotency-key, transação e conjunto de permissões (ver `src/server/clinical-registration/registration.service.ts`). `PROFESSIONAL` é papel clínico de unidade no catálogo atual; NÃO é especialidade/atribuição profissional granular. PAP_ADMIN não tem acesso clínico padrão. `deploy/admin-beta` tem `PAP_ADMIN_BETA_ONLY=1`, allowlist fechada, banco exclusivo, porta loopback 3101; **não é uma implantação do módulo clínico**.

## Fase A — inventário de compatibilidade e bloqueios (sem alteração de funcionamento)
1. Conferir SHA remoto, status, diffs e testes H44 (se houver); documentação dos concepts, `AGENTS.md`, skills e modelo Prisma.
2. Mapear cada rota/componente Premium para API clínica e modelo Prisma de destino. Planilha `COMPONENTE / DADOS DEMO / ENDPOINT CLÍNICO / PERMISSÃO / ENTIDADE / VALIDAÇÃO / PERSISTÊNCIA / STATUS`. Envolver Dashboard, Registro 5 passos, Atendimentos, Pacientes, Timeline, SOAP, Alergias, Medicações, Exames, Vacinação, Agenda, PAP-Gest, Protocolos, Chat IA, Cursos e Configurações. **Não marcar como funcional se o backend não cobre toda a operação**.
3. Comparar campos `RegistrationData` com `validateRegistrationPayload`, sem supor que os modelos de datação por USG/DPP já têm colunas correspondentes. Verificar rascunho, idempotência, status, encerrar, anotar, consultar, corrigir, autoria e histórico. Não gravar temporários somente no browser no modo clínico.
4. Criar `MATRIZ-PROFISSIONAL-E-PERMISSOES.md` para PAP_ADMIN, HEALTH_UNIT_ADMIN, PROFESSIONAL com atribuições de enfermagem/medicina e demais categorias, COMMERCIAL; **não inferir permissões de profissão do nome/cargo**, usar papel+vínculo institucional e uma autorização clínica por ação validada. O hospital aprova matriz.
5. Identificar o estado real de Agenda/Medicações/Exames/Vacinas/PAP-Gest em servidor operacional; onde falta backend, marcar BLOCKED, entregar UI desabilitada claramente sem armazenamento fictício; não simular salvamento.
6. Conferir limitações do MEOWS (motor `meows-policy.v1-draft.ts`), identidade de sessão e validação clínica. A UI clínica pode coletar medições e mostrar dados aprovados, mas **não usar score para decisão assistencial** até parecer clínico e enquadramento regulatório.

## Fase B — reutilização da UI com provedores distintos
1. Extrair props/contratos compartilhados para `src/features/premium-shared/` (ou reutilizar diretamente os componentes existentes) **sem copiar telas**. A variação ocorre somente na fonte de dados.
2. Implementar `ClinicalDataProvider` e `ClinicalGateway` server-side. Inicializa com sessão autenticada; seleciona `organizationId` dentre os vínculos ACTIVE da sessão e valida server-side **em toda requisição**. Lado cliente não escolhe autorização — header `x-organization-id` só define contexto que o servidor revalida. Ver `requireHttpOrganizationPermission` e `requireClinicalPatientScope`.
3. Garantir que o modo clínico **não importe, execute ou inicialize** `initialDemo`, `saveDemo`, `resetAppointments`, `localStorage` de registros, fixtures, QR sintético, `/api/vitrine` ou fluxos `review-lab`. Impor testes de dependência/build e isolamento no bundle.
4. Autenticação: PAP Admin cria/ativa organização HEALTH_UNIT, HEALTH_UNIT_ADMIN convida profissionais, primeiro acesso, MFA e membership ativo da unidade. O login determina contexto: profissional → workspace clínico, admin → admin, comercial → comercial/vitrine. Sem autoelevação de privilégios; organizar navegação por `PERMISSIONS` e `ROLE`.
5. Todos os GETs e mutações clínicos passam por BFF/API existente, `Cache-Control: no-store`, cookie HttpOnly/Secure, origem e CSRF, logs redigidos, versionamento e idempotency-key. Proibir acesso cruzado: usuário da UBS A jamais vê ou grava UBS B; PAP_ADMIN/COMMERCIAL também negados sem papel clínico.
6. Conectar `Registro` ao serviço `clinicalRegistrationService.submit` com payload validado, no mínimo uma jornada end-to-end por profissional. Se campos Premium não têm persistência operacional, o relatório deve identificá-los e bloquear gravação como "completo"; não remover campos para ficar verde.
7. Consolidar vínculo paciente-unidade, agenda e autoria profissional por sessão autenticada (não autor sintético fixo). SOAP precisa salvar autor real da sessão, timestamp do servidor e revisão/versionamento; revisão/assinatura e prerrogativas profissionais sujeitos à política do hospital.
8. Isolar uploads/documentos em armazenamento privado validado e auditado, nunca `public/`, `localStorage` ou fixtures. PAP-Gest clínica: não reutilizar visual "QR fake" como credencial; preservar emissão, expiração e revogação validadas.
9. LMS/Chat IA: reconhecer recursos existentes; impedir exposição fictícia como se fossem clínicos. Não prometer funcionalidade operacional não coberta por API.

## Fase C — implantação somente após gates
**Não tocar `prod`, `PROD`, `develop`, `admin-beta.papsaude.com.br`, porta 3101, banco local 15436, UI 3600, VPS, DNS ou nginx atual sem autorização adicional e inventário live.** O hospital piloto terá projeto/compose/banco/roles/segredos/volume/rede/subdomínio **independentes**. Build externo à VPS se recursos forem insuficientes. Não copiar `deploy/admin-beta/compose.yml` com `PAP_ADMIN_BETA_ONLY=1` para modo clínico; criar manifesto clínico próprio e allowlists exatas, revisadas e testadas.
- G1: testes locais/CI green, contrato UI, testes cross-tenant/role, MFA, auditoria, recuperação.
- G2: inventário VPS read-only, capacidade, backups restauráveis, TLS/rotas/segredos em staging.
- G3: contrato institucional/DPA, responsável técnico clínico, prontuário/consentimento quando aplicável, investigação LGPD/RIPD, MEOWS bloqueado para decisão.
- G4: ensaio com exclusivamente dados sintéticos em hospital, aceite formal.
- G5: autorização documentada separada de piloto com dados reais, escopo mínimo, monitoração humana, contingência e rollback. Sem G5, **NO-GO REAL DATA**.

## Testes que bloqueiam o GO
- `PROFESSIONAL(A, Hospital A)` vê somente pacientes A; `PROFESSIONAL(B, Hospital B)` não lê nem modifica A; admin/comercial sem papel clínico recebe 403; perfil desativado/sem MFA recebe 403; vínculo revogado encerra autorização.
- Fluxo clínico real com paciente **sintético criado no banco de staging**: cadastro, gestação, registro cinco passos, idempotência/retry, MEOWS sem decisão automática, timeline, persistência após reinício, autoria, auditoria; validação campo a campo e resultado.
- Formulários sem backend são honestamente bloqueados; não renderizam "salvo" por setState.
- Negativos de acesso aos endpoints `/api/vitrine`, fixtures/review, consulta privada, credenciais PAP-Gest e documentos; produção não inclui assets clínicos reais públicos.
- Backups pg_dump custom com restore fora do banco fonte, teste de integridade, auditoria de credenciais e chave de criptografia preservada.
- Infra: não degradar Admin Beta e apps existentes, portas fechadas, armazenamento suficiente, health, monitoramento, parada e rollback testados.

## Entregáveis
`docs/release/beta1-hospital-pilot-h45/IMPLEMENTACAO.md`, `MATRIZ-UI-BACKEND.md`, `MATRIZ-PROFISSIONAL-E-PERMISSOES.md`, `LACUNAS-CLINICAS.md`, `TESTES-HOSPITAL.md`, `VPS-READINESS.md`, `ACEITE-GO-NOGO.md`, `evidence/`. Commits apenas branch isolada, SHA remoto, logs redigidos. **Sem alegar conclusão de Beta 1 clínico se gateways, permissões por paciente, backup/restauração e assinatura/registro legal não foram comprovados.**
