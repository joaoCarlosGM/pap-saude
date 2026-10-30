# Segurança, regressões e testes obrigatórios

## Escopo

Não reduzir cobertura ou desabilitar guardas existentes para conseguir CI verde. Testes clínicos e administrativos de alta criticidade permanecem. NOVO domínio LMS deve ter gates separados.

## Matriz por papel / cenário negativo

- PAP_MANAGER não aciona `activate` UBS, não faz delete de UBS, não nomeia PAP_ADMIN/manager, não consulta clínica, não edita role de outro município, não atribui curso como HEALTH_UNIT_ADMIN.
- HEALTH_UNIT_ADMIN não edita curso nem publica catálogo; só atribui a usuários da própria UBS e vê o mínimo de progresso de sua equipe; não vê dados de outra UBS mesmo forçando `organizationId` na URL/body.
- PROFESSIONAL não modifica cursos, não se matricula arbitrariamente em curso indisponível, não acessa matrícula de colega nem gabarito; progresso apenas seu.
- MUNICIPAL_ADMIN não acessa cursos/unidades de outro município; encaminhamento/release somente grant autorizado.
- COMMERCIAL e Vitrine não acessam APIs `/api/courses` privadas, nem DB de clínica. Seeds demo não são persistidos na DB do curso real.
- Admin global sem grant clínico não lê prontuário via nova navegação (e vice-versa); grants sobrepostos só dão o estritamente concedido.
- MFA incompleto, sessão revogada, CSRF/origin inválida, GET RSC e prefetch não concedem acesso à API/HTML/uploads.

## Conteúdo HTML / avaliações

- XSS test cases: `<script>`, atributos `onerror`, URLs `javascript:`, CSS injection, HTML embed, link externo de rastreamento, SVG ativo, macros, arquivos polyglot; todos bloqueados/neutralizados.
- Não confiar em `finish=true`, `100%`, timestamp do client nem nota que o aluno envia; respostas corretas não aparecem no JSON do aluno.
- Ordem e versão: curso publicado imutável; novos módulos em rascunho não alteram curso já matriculado; ID/version de outro curso invalidado.
- Avaliação pode conter atividade clínica simulada sem dados reais do paciente e sem orientações assistenciais não validadas; não é dispositivo de decisão clínica.

## Estado/progresso

- Dois POSTs iguais e concorrentes de progresso: exatamente uma conclusão por aula (unique/idempotency).
- Dois POSTs de atribuição para mesma UBS/usuário/curso: sem matrícula duplicada.
- Aguardar resposta perdida/retry: cliente consulta servidor e retoma sem criar tentativa extra.
- `F5`, logout/login, web restart e PG restart preservam matrícula e progresso; cenário com 42 colaboradores não é inventado, usar dados da fixture de teste.
- Prazo vencido sem concluir: `OVERDUE` derivado, nunca apagar progresso; alterar prazo sem audit não permitido.
- Curso concluído mas certificado expirado: condições distintas.
- Nova publicação/atribuição -> badge Cursos no menu; ao marcar vistos, badge some de maneira persistente e escopada ao usuário.

## Visual / acessibilidade

- 320, 375, 390, 430, 768, 1024, 1440px; sem overflow horizontal não intencional; sidebar Drawer teclado Tab/Shift+Tab/Escape, foco restaurado; `prefers-reduced-motion`.
- Admin teal light e dark; contraste WCAG AA para texto/ícones/controles; componentes não dependem só da cor para estado.
- Todos banners sem figuras humanas; textos DOM, não embutidos em SVG; todas rotas de sidebar cobertas.
- KPIs imutáveis: comparar snapshots/contratos reais de Dashboard pré/pós sem alterar query/contadores.
- Paridade Vitrine X operacional: screenshot compare de shell/cards (conteúdo distinto de propósito), mock separado; nenhum `DemoProvider` em `src/app/(dashboard)`.

## Plano de testes econômico

A) A cada slice: `git diff --check`, TypeScript/lint do escopo, unit tests direcionados e e2e focalizado.

B) Ao fechar LMS: testes de Prisma migration em **PG descartável** e fixture de 7 papéis SEM usar seed do laboratório operador; fluxo E2E manager cria -> publica -> libera UBS -> unit manager atribui -> professional completa -> prova persistência.

C) Antes do push final: `npm run build` e gates existentes; CI remoto integral no SHA final, confirmar Docker web/migrator e Trivy. Não repetir todos os gates a cada alteração de CSS.

D) Auditoria de release: `docs/release/pap-beta1-ux-lms/IMPLEMENTATION-STATUS.md` com contagem verificada, cada RUN ID, SHA, PASS/FAIL/BLOCKED/NOT RUN e pendências.

## Critérios de reprovação imediata

- Perda de contas, reconfiguração MFA, troca de DB/volume/porta; contato com VPS/`prod`.
- Exibição de métricas clínicas/score MEOWS demonstrativo na UI assistencial ou alteração de KPIs aprovados.
- API que permite outra UBS gerenciar matrículas ou scripts HTML arbitrários com cookie do PAP.
- Gravar valores fictícios na DB operacional para melhorar screenshot.
- Badge de novidade/progresso fictício quando não existe publicação/atribuição real.
