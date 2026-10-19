# MISSÃO 02 — PAP ADMIN BETA 1
## Integração funcional do onboarding, convites, gestão e inteligência operacional

**Origem:** merge F04.10 em `develop`, commit `9b9f4951ebeca4121acecb435659727bf0fa3c97`.
**Branch exclusiva:** `codex/pap-admin-beta1`. **Nunca executar merge/deploy automaticamente.**
**Pré-condição para iniciar implementação:** CI do merge em `develop` na revisão de origem concluído com SUCCESS. Caso falhe, investigar e registrar; não construir a beta sobre baseline quebrado. Antes de começar, verificar se houve novos commits em develop e pedir autorização antes de atualizar/rebasear uma branch com alterações próprias.
**Objetivo:** um administrador PAP recebe uma solicitação de UBS, valida e aprova a instituição, envia convite institucional por e-mail ao primeiro administrador da UBS, o responsável ativa sua identidade e convida profissionais, e o PAP Admin acompanha utilização com dados reais, papéis corretos e UI premium. Tudo em staging/ambiente isolado, sem usar dados pessoais/clínicos reais.

### 0. Inventário obrigatório e modelo do sistema existente
Leia `AGENTS.md`, docs de F04.10, `prisma/schema.prisma`, enum/catálogo IAM, `src/server/admin/`, `src/server/invitations/invitation.service.ts`, `src/server/email/email.service.ts`, `src/server/activity/`, `src/components/admin/`, `src/app/(admin)/admin/`, `src/app/api/admin/`, `src/app/api/invitations/accept/route.ts`, `.github/workflows/ci.yml` e testes relevantes. Não reimplementar componentes que já funcionam.

**Modelo a preservar:** identidade `User` global; `Organization` PAP → MUNICIPALITY → HEALTH_UNIT; `Membership` por organização; `RoleAssignment` com escopo; `OrganizationCandidate` e `OrganizationRequest`; estados de organização; `PAP_ADMIN` GLOBAL, `MUNICIPAL_ADMIN`, `HEALTH_UNIT_ADMIN`, `PROFESSIONAL` e papéis realmente definidos no catálogo. Nenhum `PAP_ADMIN` obtém permissão implícita para dados clínicos.

**Estado conhecido, verificar no código:** convite `createProfessionalInvitation` aceita somente `PROFESSIONAL`, envio Resend existente é básico e não comprova entrega, dashboard inicial contém cartões estáticos, operações/analytics existentes são tabelas parciais com eventos `PRODUCT_ACTIVITY_EVENTS`. F04.10 oferece migração e role separation mas não comprova release de produção.

## 1. Fluxo institucional completo (transacional e auditado)
1. **Solicitação pública de adesão**: formulário responsivo para UBS/instituição com identificação, município, CNES/CNPJ quando aplicáveis, endereço, informações do contato responsável, consentimento/aviso e validação estrita. Evitar vazamento de dados de contato e enumeração de solicitações. Criar `OrganizationCandidate`/`OrganizationRequest` segundo schema real; escolher tratamento para município ainda não cadastrado sem ativar por conta própria. Rate limiting/anti-abuso e revisão de duplicidades.
2. **Fila de revisão PAP**: lista paginada, filtros reais, detalhes, documentos se suportados pelo schema (não simular upload), motivos de aceite/rejeição, histórico; controle de concorrência e transições idempotentes. `PAP_ADMIN` revê e aprova, ações auditadas. Uma solicitação não pode criar duas UBS, nem permitir vínculo com município errado, nem ativar UBS sem aprovação válida.
3. **Ativação hierárquica**: ligar cada UBS ao município correto sob PAP, preservar invariantes e `OrganizationStatus`. Evitar criar entidade duplicada por reenvios/corridas de rede. Operações administrativas devem usar services e transações server-side, nunca privilégios baseados em controles do frontend.
4. **Bootstrap do primeiro responsável**: após aprovação, convite `HEALTH_UNIT_ADMIN` de uso único, expirável, com hash do token armazenado, vínculo à UBS correta, `Membership` e `RoleAssignment` scoped. Tratar identidade existente, vínculo preexistente, convite revogado, expiração, convite concorrente e aceite repetido. Jamais permitir autoatribuição por formulário público. Garantir sessão/MFA conforme política real e fluxos de onboarding.
5. **Convidar profissionais**: responsável da UBS autenticado pode convidar somente `PROFESSIONAL` no escopo permitido, com listagem de pendentes, reenvio seguro, revogação e histórico. Nenhum admin UBS pode administrar município, PAP ou outra UBS; `PAP_ADMIN` atua segundo permissões administrativas efetivas. Profissional convidado não ganha acesso a outra UBS sem outro vínculo.
6. **Ações de erro/retentativa**: política explícita para falha de envio após commit: convite nunca pode ser considerado entregue sem confirmação do provedor; status de entrega é distinto de status de aceite. Preferir outbox/retry idempotente (ou mecanismo equivalente compatível), com auditoria. Não expor tokens completos em logs, analytics ou respostas públicas. Cada passo deve ter eventos e estados consistentes.

## 2. E-mails institucionais PAP Saúde (obrigatório para beta homologada)
- Reutilizar `PAP_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `PAP_EMAIL_FROM`, `PAP_PUBLIC_URL`, nunca armazenar credenciais no Git.
- Template HTML + texto simples, layout responsivo PAP Saúde com paleta institucional (teal base `#064f50`), título claro, UBS e responsável identificados com escape HTML, CTA de ativação, aviso de validade/segurança e suporte; evitar imagens externas obrigatórias para entendimento.
- Verificar origem pública HTTPS em produção e domínios permitidos, nunca gerar links com host arbitrário vindo do request.
- SPF/DKIM/DMARC e domínio do remetente (p.ex. `convites@papsaude.com.br`) são CONFIGURAÇÃO EXTERNA A HOMOLOGAR, não alegar que funcionam por estarem no código.
- Testes mockados do provedor e contrato de integração: sucesso, timeout, 4xx/5xx, reenvio, revogação, link expirado, clique/aceite, provedor sem chave em production falha de forma segura. Entrega real em inbox é gate operacional externo. Status `sent` não é o mesmo que `delivered`; webhook exige autenticação e idempotência, se implementado.
- UI deve permitir mostrar status com fonte/limitação, sem abrir token ou exibir URL sensível em produção.

## 3. PAP Admin Beta 1: interface premium, dinâmica, utilizável
- Implementar com os componentes Next.js existentes, estilo do protótipo **PAP Admin V3 aprovado no chat**: shell teal/escuro, grandes superfícies claras com cantos arredondados, tipografia e ícones uniformes, navegação premium em sidebar com grupos recolhíveis, busca de páginas, modo compacto/hover, foco e acessibilidade, sidebar mobile.
- IMPORTANTE: o protótipo HTML não está comprovadamente versionado no GitHub. Se o HTML/imagens não estiverem disponíveis no checkout, não alegar pixel-perfect. Criar implementação baseada na especificação e solicitar o artefato visual para comparação final; não bloquear a lógica de segurança por isso.
- Carregamento por widget/área (skeleton shimmer, stale data explícito, partial refresh, estados loading/empty/error/retry), sem bloquear dashboard inteiro. Filtros de período e município/UBS reais, paginação, URL state onde adequado; nenhum mock apresentado como dado de produção.
- Páginas completas: dashboard executivo/operacional, solicitações, organizações, usuários/convites, permissões, auditoria e métricas. Ações críticas com confirmação, loading, rollback visual e feedback de erro compreensível. Telas são configuradas por permissão efetiva; API continua enforcement definitivo.
- Respeitar contraste, keyboard, aria, responsive desktop/mobile, timezone pt-BR e datas/moeda conforme dados.

### Escopo EXCLUÍDO por decisão de produto
**NÃO implementar nesta missão o Kanban técnico, Central de TAs avançada, persona de Desenvolvedor Sênior, automações GitHub Issues/PR nem o módulo de manutenção**: preservar para F07, prioritariamente para PAP Admin geral. Um ponto simples de feedback pode ser anotado como proposta futura; não adicionar schema completo de tickets agora. Não alterar fluxos clínicos F03 exceto integração indispensável e testes de regressão.

## 4. Analytics sem estatísticas inventadas
- Partir de `ProductActivityEvent`, `OrganizationMetricSnapshot`, operações e guardas existentes; mapear **emissores reais** de eventos. Não interpretar catálogo definido como evento efetivamente coletado.
- Cards executivos: UBS aprovadas/ativas; responsáveis/profissionais convidados, ativos e elegíveis; UBS com atividade funcional; DAU/WAU/MAU quando dados permitirem; retenção/coortes com denominadores explícitos; jornadas completadas (sem ler prontuários como PAP Admin), distribuição por município/UBS; saúde do fluxo de convites. Evitar alegar desfechos de saúde ou eficácia clínica sem estudo específico.
- Definir adoção funcional: denominador UBS elegíveis e onboarded com profissional ativo; numerador UBS com evento funcional válido na janela. Não confundir login ou dashboard.viewed com atividade clínica concluída. Definir temporalidade, fusos, paginação e estados NOT_INSTRUMENTED / NO_DATA / INSUFFICIENT_SAMPLE.
- Nunca retornar identificação de pacientes ou payload clínico em endpoints admin; limitar metadados ao allowlist; aplicar supressão de pequenas coortes (<5), controle tenant e limites de filtros adversariais; auditoria e anti-IDOR.
- Gráficos reais (SVG/Canvas compatível) com tabelas acessíveis; exportar somente dados agregados autorizados, sem vazamento por CSV e com fórmulas inofensivas (CSV injection mitigada).

## 5. Segurança e segurança de produção
- Manter baseline F04.10, Prisma migrations forward-only e runtime/migrator least-privilege. Sem operações na VPS, sem dados reais, sem segredos, sem merge/deploy `prod`, `PROD`, `develop`.
- Autorização em **todos os endpoints**, origem/CSRF para mutações, rate limiting/abuso e proteção de enumeração; integração de papéis só server-side; transações/locks/constraints no caminho crítico; auditoria append-only minimizada e privada.
- Verificar que `PAP_ADMIN` sem atribuição clínica não consegue abrir pacientes, gestantes, encontros nem payloads de prontuário por APIs.
- Todas as migrations adicionais devem ser incrementais, revisáveis, compatíveis com migração existente e executadas apenas em PostgreSQL descartável/CI. Dados sintéticos apenas.
- Sem claims de conformidade LGPD, interoperabilidade RNDS, entregabilidade de e-mail ou segurança total sem validação externa correspondente.

## 6. Testes mínimos de aceite E2E e adversariais
**Jornada principal:** preencher solicitação pública → fila PAP → aprovação auditada → UBS no município correto, ativa no estado correto → convite HEALTH_UNIT_ADMIN → envio mock (e evidência de envio em ambiente isolado) → aceite de token e vínculo/role corretos → login do responsável → convite profissional → aceite → acesso profissional somente à UBS permitida → eventos reais instrumentados → dashboard reflete atividade e filtros autorizados.
**Jornadas negativas:** payload inválido/malicioso, duplicidade de CNES/CNPJ conforme regras do produto, solicitação repetida ou concorrente, aprovação dupla, solicitação rejeitada sem ativação, convite expirado/revogado/consumido, repetição após queda, falha do Resend, profissional criado no tenant errado, escalada de papéis, bypass sem MFA, enumeração de emails, CSRF e IDOR, analytics de baixa contagem, CSV injection.
**Qualidade:** `npm ci`, `npx prisma validate`, `npx prisma generate`, `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, F04 integrado, F03 regressão completa e autenticação/MFA. Testes e builds Docker/CI relevantes, com mock de infraestrutura externa; navegador em viewport desktop e mobile (Playwright ou equivalente) se disponível.
**Proibido:** enfraquecer asserts existentes para passar testes, silenciar falhas, conferir PASS apenas por ausência de exceção, usar credenciais reais em CI.

## 7. Execução organizada e entregáveis
Implementar autonomamente em subfases com commits pequenos:
- A. Modelo e endpoints de solicitação pública/triagem/ativação UBS.
- B. Convite inaugural `HEALTH_UNIT_ADMIN`, profissional, Resend e monitoramento de entrega.
- C. UI premium administrativa e fluxos reais sem mock.
- D. Instrumentação e indicadores reais com privacidade.
- E. Regressões, E2E, segurança e relatório de Beta 1 candidata.

Documentar em `docs/admin/pap-admin-beta1-acceptance.md`: matriz de requisitos e testes, caminhos e contratos API, invariantes IAM/convites, definição matemático-operacional de KPIs, capturas e evidências de UI quando possível, checklists de DNS/Resend/HTTPS/restore, incidentes conhecidos, bloqueadores `NO-GO`, orientação para homologação em staging e resumo de commits.

**Critério para READY FOR REVIEW:** baseline CI da develop estava verde antes de iniciar; fluxo completo automatizado com mocks passou; validação de papel/escopo é server-side; F03/F04 sem regressão; indicadores honestos, interface utilizável; nenhuma dependência externa omitida.

**Critério para BETA 1 HOMOLOGADA:** além do software, usuário operador precisa confirmar domínio SPF/DKIM/DMARC, remetente, recebimento REAL de convite, ativação REAL em staging HTTPS, proteção do GitHub, backup/restore e deploy em infraestrutura validada. Codex não pode autodeclarar esse aceite.

Se o ambiente não permitir integrar/testar algo, registrar BLOCKED com motivo e instrução para operador, não declarar sucesso. Abrir PR para `develop` sem merge/deploy; responder em português com commits, testes, lacunas e status GO/NO-GO.