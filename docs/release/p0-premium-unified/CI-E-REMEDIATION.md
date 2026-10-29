# Correção dirigida do gate E — 29/10/2026

Branch feature/p0-premium-unified-rc; parent testado e0f2bafb7cb4eb24e080acc860a3a594d43799b0. CI40931996563 falhou primeiro em Slice E, após Premium, UI P0, primeiro acesso/MFA, B, C e D. Não houve publish/deploy. O operador confirmou journey.spec.ts:43 (banner antigo).

## Causas e correções

- O E ainda exercitava a Vitrine anterior: faixa removida, títulos antigos, miniwizard, progresso fictício de curso e botão de chat antigos. Os testes agora exercitam o modal com aviso obrigatório, indicador na sidebar, prontuário por cartão, wizard Premium, estado em memória, curso indisponível sem falso playback, chat explicitamente simulado, restauração e logout.
- Axe revelou cores com contraste insuficiente, campos/filtros sem nome e botão sem ação. Paleta e portais foram corrigidos com CSS restrito a data-vitrine-premium/data-vitrine-dialog. Input usa useId preservando IDs explícitos. O Chat ganhou h1 acessível; a ação sem implementação permanece explicitamente indisponível. Nenhuma API nova.
- Drawer mantinha semântica modal ao redimensionar para desktop: fecha no breakpoint768, preservando foco e teclado. O assert anterior foi mantido.
- Com movimento reduzido, texto sr-only dos contadores escapava do seu contêiner: documento1453px para viewport900, apesar do main interno correto. Experimento controlado adicionando position:relative ao contador reduziu o documento a900px. Regra agora restrita à Vitrine; teste verifica ausência de rolagem externa. Capturas continuam fullPage, sem cortar/editar o defeito.
- RSC: s não significa sufixo vazio. Next16.4.2 define static siblings em node_modules/next/dist/shared/lib/rsc-transport.d.ts:38 e app-router-types.d.ts:82. A rota estática pacientes contém [id] e é irmã de [section]. Recebido {n:section,t:d,k:pacientes,s:[pacientes]}. Aceita-se somente esse irmão público adicional, além de null/[]; nenhum valor arbitrário.

## Segurança preservada

O contrato RSC mantém n/t/k exatos, quatro chaves, árvore fechada e ausência de linhas/payloads extras. Testes rejeitam nomes/chaves/rotas inesperadas, irmãos desconhecidos, duplicados, arrays decorados e dados clínicos. Prefetch público de navegação não autoriza renderização.

Mantidos HTTP403 de GET/POST da Vitrine após revogação, acesso clínico403, ausência de escrita e reload negado. O POST agora é uma requisição explícita, porque o wizard Premium edita somente memória e não chama o endpoint antigo. Não se forçou uma chamada de banco na demonstração para satisfazer um teste obsoleto.

O papel pap_m04_e_readonly continua sem SELECT/INSERT/UPDATE/DELETE em organizações/prontuários. As jornadas reais usam esse papel; negativas que consultam metadados IAM usam somente o owner da DB descartável. Todo recurso foi criado com CID/UUID/labels próprios e removido por propriedade comprovada. Nenhum banco existente foi adotado.

A invariante de imutabilidade da feature foi refinada somente para oito adições exatas de apresentação (import CSS, atributos/labels/IDs, h1 e fechamento responsivo). Todo o restante, incluindo fixtures, modelos, Registro, MEOWS, rotas, IAM, MFA, Prisma e serviços clínicos, continua comparado byte a byte à base. CSS novo não pode importar assets externos ou selecionar raízes operacionais. Nenhum assert de autorização removido.

## Validação no conteúdo composto

| Comando / evidência | Resultado |
|---|---|
| PAP_E_RUN_BOTH=1 PATH=/tmp/pap-unified-node22/bin:$PATH node /tmp/pap-unified-evidence/reproduce-e-browser.mjs browser | PASS10 Node (8 backend+2 RSC),3 jornadas readonly e3 fronteiras; sequenciais na mesma DB própria |
| node --test tests/vitrine-premium/components.test.mjs tests/vitrine-premium/isolation.test.mjs | PASS7 (2 componentes+5 invariantes) |
| npx tsc --noEmit / ESLint dos arquivos alterados | PASS / PASS |
| npm run build, Node22.23.4, fontes locais reais | PASS |
| node --test tests/premium-unified/release-artifact.test.mjs | PASS2; standalone sem configurações privadas |
| git diff --check | PASS |

O harness local apenas substitui recursos fixos do launcher legado por cluster/CID/porta/credenciais aleatórios próprios; não altera testes nem ACL para obter PASS. Logs privados em /tmp/pap-unified-tests-v50x68/{e-backend,browser,e-boundaries}.log e /tmp/pap-unified-evidence/e-release-build.log. Hashes em VALIDATION.json; não publicar logs brutos. Capturas atuais: evidence/vitrine-aa-1440-light.png e evidence/vitrine-aa-320-dark.png, dados exclusivamente sintéticos/campos mascarados, revisadas.

## Limites e próxima ação

CI do próximo SHA obrigatório. LocalChromium154; managed156 não pôde ser baixado por403 Domain forbidden, sem contorno/reinstalação da aplicação. Docker local e laboratório persistente3600 continuam BLOCKED ENOSPC; Trivy local NOT RUN. Auditorias anteriores de dependências mantidas porque os lockfiles não mudaram; gates remotos continuam obrigatórios. Não há GO de release/produção/VPS.

Não foram acessados/modificados laboratórios do operador, contas, MFA, banco/volume existentes ou VPS. Não houve e-mail externo, merge, PR, deploy ou push de produção.

## Inventário seletivo desta correção

```text
docs/release/p0-premium-unified/CHECKPOINT.md
docs/release/p0-premium-unified/CI-E-REMEDIATION.md
docs/release/p0-premium-unified/EVIDENCE.md
docs/release/p0-premium-unified/GO-NO-GO.md
docs/release/p0-premium-unified/SOURCES.json
docs/release/p0-premium-unified/VALIDATION.json
docs/release/p0-premium-unified/evidence/vitrine-aa-1440-light.png
docs/release/p0-premium-unified/evidence/vitrine-aa-320-dark.png
src/features/vitrine-premium/accessibility.css
src/features/vitrine-premium/components/chat/ChatHeader.tsx
src/features/vitrine-premium/components/cursos/CourseList.tsx
src/features/vitrine-premium/components/layout/DashboardShell.tsx
src/features/vitrine-premium/components/layout/Sidebar.tsx
src/features/vitrine-premium/components/pacientes/PatientList.tsx
src/features/vitrine-premium/components/ui/Input.tsx
src/features/vitrine-premium/components/ui/Modal.tsx
src/features/vitrine-premium/views/chat.tsx
tests/mission04-e/boundaries.spec.ts
tests/mission04-e/journey.spec.ts
tests/mission04-e/premium-ui.ts
tests/mission04-e/rsc-dynamic-metadata.test.ts
tests/mission04-e/rsc-dynamic-metadata.ts
tests/vitrine-premium/components.test.mjs
tests/vitrine-premium/isolation.test.mjs
```

Inventário completo do candidato: 115 caminhos em SOURCES.json (hash próprio excluído). O SHA exato final será o HEAD/CI; os hashes representam o conteúdo testado, sem referência circular.
