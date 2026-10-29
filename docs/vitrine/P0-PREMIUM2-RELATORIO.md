# P0 — integração Vitrine Premium2.0

Branch: `feature/p0-vitrine-premium2-integration`.
Início:a45110832513014537b22c9415d2ebfe042220bf; comparação operacional:7526cb95454017ede8a77113f91ce3b43e2dc7df; origem visual:64fc7a9317159436c36c801051ed2065d29547af.
Commits funcionais:b345317 (camada sintética/tipos/testes) e0a007755294fec581c5e9ea0cfbbdfb49a6810fa (componentes/host/guarded routes). Testes/capturas:0b3649fec83b35eecff08d334395e2092dfba787. Os commits de testes/documentação seguintes não alteram o código funcional testado; SHA de entrega é o HEAD da feature, informado após push. Proveniência e fingerprints: P0-PREMIUM2-PROVENIENCIA.json e P0-PREMIUM2-EVIDENCIAS.json.

## Resultado

Porte seletivo do grafo necessário:117 arquivos isolados em `src/features/vitrine-premium`, sem merge/cherry-pick e sem trazer login, dependências, app root ou páginas clínicas da origem. Somente os três arquivos de apresentação existentes de `/vitrine` foram modificados, mais uma folha nova para pacientes. Host/layout mantém a autorização comercial antes do provider; todas as folhas repetem o guard para URL direta/RSC e revogação subsequente.

Todas as rotas/componentes de navegação/tour apontam para `/vitrine/*`. Root `/vitrine` é Dashboard; `/vitrine/dashboard` alias. Registro, pacientes, atendimentos, chat, protocolos, ferramentas, cursos, configurações e ajuda têm whitelist própria. Pacientes seed e registros novos em memória usam `/vitrine/pacientes/[id]`, com404 para desconhecidos/IDs reais; querystrings de seleção de tenant são recusadas. A API Vitrine antiga/`isDemoSection` não foram ampliadas nem usadas pelo novo host.

Sidebar branca com perfil/município/UBS fictícios, Configurações no rodapé, retorno explícito ao Comercial, indicadores/estrelas rosa/animações, cinco etapas, dados e histórico compartilhados, modal e tour real de seis etapas foram portados. Modal/tour não substituem onboarding/MFA P0. O novo perfil não recebe identidade ou instituições da sessão real. Não se alterou o shell clínico/comercial operacional.

Motor demo foi portado sem mudança de conteúdo/SHA. Resultado, atendimento, prontuário e evolução usam o mesmo snapshot/protocolo em memória; ausentes ficam INCOMPLETO/null, inválidos não são salvos, crítico é independente do total, fixtures são ilustrativas. Não há conduta automática. `src/server/meows/*` assistencial continua DRAFT_UNVALIDATED, sem ativação de classificação/alerta clínico.

## Testes executados no P0 integrado

| Grupo | Resultado efetivo |
| --- | --- |
| `node --test tests/vitrine-premium/*.test.mjs` | PASS80/80:76 adaptados da origem (inclui55 motor/6 integração) +4 isolamento |
| Fronteiras P0 e engine/política MEOWS operacional | PASS22/22 |
| Acesso comercial/IAM legadoE | PASS8/8 |
| IAM delegado/B | PASS27/27 |
| Auth/MFA criptografia | PASS18/18 |
| Auth/MFA integração, harness F02 original em recursos próprios | PASS186/186 |
| MEOWS integração clínica legado | PASS8/8 |
| Integridade/concorrência/proveniência/privacidade clínica |38 casos PASS na rodada39;1 recusado pelo guard de porta do harness |
| Registro com login/runtime restrito, reexecução dirigida | PASS1/1 na porta descartável25445 exigida pelo teste; completa cobertura do grupo anterior |
| Browser real com runtime sem acesso a tabelas clínicas/organizações | PASS1 jornada completa, tour6 etapas,60 visitas de módulos/larguras, snapshot crítico3, histórico, reset e fingerprint DB inalterado |
| Browser fronteiras HTML/RSC/API, sessão/MFA/IAM/revogação/404 | PASS1 cenário matricial;12 rotas para cada classe testada |
| Browser cartões/linhas/recentes por teclado, Tab/foco/Escape | PASS1/1 |
| Browser INCOMPLETO Resultado→Ficha→Evolução→Dashboard | PASS1/1;total— e exclusão do denominador de categorias |
| Capturas com dimensões auditadas | PASS1/1;18PNG reais integrados |
| TypeScript | PASS, inclusive após o build interrompido |
| Lint global | PASS0 erros;4 warnings herdados em2 testes não modificados |
| Lint do porte/testes | PASS0 erros/0 warnings |
| `git diff --check` / staged checks | PASS |
| Build real `npm run build` | BLOCKED/exit1: Google Fonts CONNECT403 |
| Preview descartável/manual launcher | PASS:login200,Vitrine anônima307,credenciais0600,cleanup proprietário |

Contagens acima são por suíte/execução, não uma soma de casos únicos: alguns testes de política aparecem em mais de um grupo. Não se usaram resultados da origem como substitutos. Logs completos privados em `/tmp/premium-p0-evidence`; evidência versionada é apenas status/hashes/dimensões e capturas sintéticas. A comparação dos hashes após commits garante o mesmo conteúdo funcional que foi validado.

### Falhas diagnosticadas e corrigidas sem enfraquecer gates

1. Testes Node da origem usavam whitelist de rotas raiz: as fixtures do teste foram adaptadas ao prefixo sem remover asserts;80/80 passaram.
2. Runner Playwright precisava de cwd explícito. A resolução Turbopack também recusou o symlink externo de dependências; a worktree foi movida para `/tmp/pap-p0-premium2-integration` com1105 hashes preservados e dependências imutáveis reutilizadas localmente. Nenhuma reinstalação, geração Prisma ou mudança de Next config foi feita. Tentativa de links entre sistemas de arquivos falhou e o diretório incompleto próprio foi substituído; originais preservados. Caches de diagnóstico antigos foram compactados/preservados fora do projeto.
3. Locator crítico encontrava header e histórico: foi restrito à tabela para provar precisamente o histórico, mantendo a asserção.
4. Screenshot antes da hidratação inseria `caret-color:transparent` em inputs SSR e provocava32 avisos React. Captura completa comprovou a diferença. O teste agora espera o sinal real de hidratação do provider antes de capturar/interagir; não houve suppressHydrationWarning, remoção de verificação de console ou mudança do produto.
5. Teste operacional de registro aceita somente25441/25445 e recusou a porta dinâmica. Preservou-se a asserção, isolando sua reexecução em container próprio25445. Os38 casos já aprovados não foram repetidos. O runner separa esses grupos por compatibilidade de infraestrutura.
6. Seed auxiliar de preview precisava de main async para TS/CJS: corrigido somente no teste, validado pelo smoke real. O primeiro launcher auth não atingiu prontidão; a suíte completa foi validada depois em tmpfs próprio reaproveitando as mesmas asserções do harness original.

## Segurança e preservação

Relatório específico: P0-PREMIUM2-SEGURANCA.md. Runtime restrito teve SELECT/INSERT/UPDATE/DELETE negados em organizações e tabelas clínicas e ainda assim executou todas as jornadas Premium. O grafo sintético não tem Prisma, serviços clínicos ou fetch; zero chamadas `/api/` durante salvar/restaurar. Contagens clínicas/institucionais e concessões permaneceram iguais durante a jornada; o e-mail do ator não apareceu na página. Auth, MFA, IAM, APIs, esquema/migrations, MEOWS assistencial, dependências, CI/CD e infraestrutura existente são byte idênticos à base protegida.

Foram criados/migrados somente bancos novos em containers tmpfs descartáveis etiquetados e vinculados a loopback. Nenhum banco, volume, conta ou chave existente foi utilizado. Todos os recursos desta missão foram limpos após testes, inclusive o smoke do preview. Não foram acessados/atualizados laboratório P0/3200, original3300, VPS ou produção. Não houve PR, merge, deploy, e-mail externo, alteração de DNS/SSH/CI ou push em outra branch.

## Capturas e comparação

`p0-premium2-evidence/`:9 superfícies ×390/1440px (Dashboard, Registro, Pacientes, Atendimentos, Chat, Configurações, boas-vindas, tutorial, Resultado). Dimensões reais verificadas no PNG, sem rotular1280 como1440. Responsividade funcional também foi exercitada em320,375,390,430,768,1440, incluindo10 módulos por largura.

Inspeção das capturas integradas Dashboard1440 e Resultado390 comparada à Premium aprovada: grade de8 KPIs, sidebar branca, rosa, componentes/formulário/tipografia de fallback preservados. Mudanças deliberadas: prefixo, alias de Dashboard, retorno ao Comercial,404 e separação de namespaces. Não é comparação pixel a pixel certificada ou homologação humana/WCAG. O fallback tipográfico também aparece nas referências da origem; fontes reais dependem da resolução do bloqueio externo.

## Build e pendências externas

Build executado neste P0, Next16.4.2. Falhou ao buscar Inter/Geist/Geist Mono em Google Fonts. Consulta pública independente confirmou CONNECT403 no proxy. Não houve bypass TLS, fonte substituta, mock de build ou mudança de dependências. TypeScript/lint passaram separadamente; etapas posteriores ao erro de fontes no build ainda não estão comprovadas. Reexecutar build em rede legítima é obrigatório antes de promover o candidato.

CI remoto do novo SHA não foi executado como gate desta missão nem alterado; os resultados de CI de outras branches não validam esta entrega. Docker web/migrator e scanners não foram reconstruídos nesta integração de apresentação, e não se declara aprovação de release a partir destes testes.

Decisão: **candidato para homologação demonstrativa isolada3500; NO-GO para produção/release enquanto build/homologação estiverem pendentes.** A nova branch não atualiza o laboratório3200. Qualquer atualização desse laboratório, PR, merge ou deploy requer autorização posterior.

## Comandos WSL — nova cópia, sem tocar nos laboratórios

Pré-requisitos: Node compatível com o lockfile, npm e Docker local já disponíveis. Não alterar Docker context para VPS nem abrir túnel público. Usar nova pasta; clone falha se destino já existe, não apagar/sobrescrever.

```bash
cd ~/projetos
git clone --single-branch --branch feature/p0-vitrine-premium2-integration https://github.com/joaoCarlosGM/pap-saude.git pap-vitrine-premium2-3500
cd pap-vitrine-premium2-3500
git rev-parse HEAD
# URL de preparação não corresponde a banco real; generate não aplica migrations.
DATABASE_URL='postgresql://setup_only:synthetic_only@127.0.0.1:1/pap_p0_full_tests?schema=public' npm ci
DATABASE_URL='postgresql://setup_only:synthetic_only@127.0.0.1:1/pap_p0_full_tests?schema=public' npx --no-install prisma generate
ss -ltnp 'sport = :3500'
# Com3500 livre, cria APENAS banco/container temporário próprios e inicia o P0 integrado:
node tests/vitrine-premium/run-integration.mjs --preview
```

O launcher imprime o caminho do arquivo local de credenciais0600, nunca a senha. Leia-o apenas localmente. Conta COMMERCIAL sintética e independente, sem TOTP pré-configurado; acesse http://127.0.0.1:3500/login, complete CAPTCHA e a inscrição MFA real pelo fluxo P0 (`/primeiros-passos`, se necessário). Adicione uma entrada distinta no autenticador, só desta conta de teste; não reutilize senha/seed/MFA do3200. Em `/comercial`, use Abrir vitrine demonstrativa ou vá a `/vitrine`.

Ctrl+C no terminal desse launcher encerra o preview e remove apenas o container próprio identificado por labels/CID. É um laboratório **descartável**, não um segundo perfil persistente: novo comando cria nova conta/banco; não tem função de atualizar ou resetar o3200. Não executar local:init/local:admin/reset, copiar.env do laboratório, nem apontar o launcher a banco existente. A flag de boas-vindas é apenas apresentação da sessão do navegador. Registros sintéticos em memória desaparecem no reload/restauração.

### Roteiro manual

1. Login/MFA legítimos da conta temporária; tentar `/vitrine` antes de concluir MFA deve ser negado. Nenhum acesso anônimo é liberado.
2. Percorrer seis etapas e Ajuda/reabrir/skip/Escape. Conferir prefixo de todos os destinos e retorno ao Comercial.
3. Registro fictício: CPF32165498701, Pessoa Sintética,05/03/1995,DUM desconhecida;PAS160/PAD70/FC80/FR14/37,0°C/Alerta/Ar ambiente → score3/crítico, sem conduta automática. Salvar, abrir ficha, histórico, atendimento e Dashboard.
4. Novo registro com medição ausente → INCOMPLETO/total—, sem falso normal. O₂4,9 pontua2;5 pontua3;ausente incompleto;fluxo0 é recusado. Dados permanecem só na memória desse host.
5. Testar cards por teclado, Tab/foco/Escape, mobile e modo de movimento reduzido, drawers do Chat, perfil/município/UBS fictícios e reset confirmado. Conferir que as instâncias3200/3300 continuam independentes.

### Reexecutar testes dirigidos, sem bancos existentes

```bash
node --test tests/vitrine-premium/*.test.mjs
node tests/vitrine-premium/run-integration.mjs
node tests/vitrine-premium/run-integration.mjs --regressions-only
node tests/vitrine-premium/run-integration.mjs --runtime-only
node tests/vitrine-premium/run-integration.mjs --keyboard-only
```

Executar sequencialmente. O runtime-only exige25445 livre para obedecer ao guard original, nunca o remove. Modos browser-only/readonly-only/incomplete-only/capture-only/hydration-only servem a diagnóstico dirigido; o runner recusa modos desconhecidos/conflitantes. Não rodar dois launchers na3500. Logs ficam em diretório privado temporário informado pelo runner; credenciais/URI MFA/JSONs brutos não devem ser publicados.
