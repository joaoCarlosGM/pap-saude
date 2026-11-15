# Ajustes pós-homologação PAP-ID / Protocolos — entrega local

Branch de correções: `feature/beta1-post-homologation-fixes`.
Base remota conferida: `a953ca7368dda07715732f0978dd411d90cf164b`, candidata integrada.
Código funcional validado: `ee44853` (commit local).
SHA final: consultar HEAD da branch/bundle; não gravar hash circular no próprio commit.
Inventário completo e fingerprints: `evidence/manifest.json`.

**GO somente para homologação demonstrativa privada no novo perfil isolado.**
**NO-GO para publicação, produção ou uso assistencial.** Sem push, PR, merge, deploy ou VPS.

## Correções efetivas

1. PAP-ID inicia pela carteirinha; leitura, seleção, confirmação e resultado são estados exclusivos.
   Importação fica em disclosure secundário. A fila substitui o painel de leitura, conserva até
   20 candidatos, permite PNG múltiplo/sucessivo, remoção e seleção explícita. Deduplicação por
   identidade/documento e hash; nada de enumeração de dispositivos/pacientes reais.
   Após seleção, CPF ou RG fictício/UF/emissor e contexto; sem resumo antes da confirmação.
   Resultado compacto, resumo expansível, prontuário ou mesmas etapas 2–5. Foco/rolagem dirigidos,
   Escape retorna à seleção; controles primários da fila visíveis em 1440×768, mobile sem overflow.
2. Pacientes oferece emissão/reemissão/revogação para as pessoas sintéticas já presentes no
   catálogo inicial. O QR PNG é real e opaco, sem identidade no payload. O cartão privado mostra
   documentos fictícios para conferência. Emissor fora da fixture autorizada fica desabilitado,
   sem fingir persistência. Reemissão revoga a anterior; histórico não duplica cadastro.
3. Botão explícito **Voltar aos protocolos** antes do cabeçalho. Mantém rota/deep-links/history;
   filtros/marcações continuam no componente compartilhado enquanto montado. Não se promete
   persistência desses filtros após reload/nova sessão.
4. Visões gerais dos três documentos agora usam resumos fiéis e citações: seção, página digital,
   página impressa e versão. Fluxograma mostra a figura original no leitor privado, não o antigo
   diagrama genérico. Checklist distingue transcrição parcial de adaptação para leitura. Marcar
   significa “li”, nunca “executei”. Sem doses, prescrição, CDS ou classificação assistencial nova.
5. PostgreSQL novo e descartável, projeto/volume/usuário próprios, porta loopback alocada pelo
   Docker. Nenhuma configuração/credencial operacional foi reutilizada. UI e nova CLI usam o
   mesmo adaptador SQL: lock de pessoa, transação, chave idempotente única e índice parcial de
   uma credencial não revogada por pessoa. Credenciais têm validade de 24h; expiração/revogação
   são verificadas na resolução. O banco guarda somente hashes de tokens e o catálogo sintético.
   Repetição da MESMA operação não cria outra emissão; nova operação é uma reemissão legítima.
   Identidades importadas não podem ser reassociadas silenciosamente por hash/documento/revisão.

## Banco, fronteira privada e limites honestos

Perfil criado pelo executor em `.local/pap-id-review-2u6r2z/profile.json` (privado, NÃO versionado).
DB `pap_id_review_7e8d0542d855`, projeto `pap-id-review-7e8d0542d855`, porta inicial 32768;
porta efetiva deve ser consultada em `status`, não fixada no roteiro. Senha nova aleatória.
Banco próprio parado ao fim dos testes, com volume preservado para retomada.
Três tabelas de teste (`review_meta`, `review_people`, `review_cards`) e um índice parcial;
**nenhuma migration Prisma operacional foi executada ou modificada**.

`readProfile` rejeita nomes/portas proibidos, labels/mount/proprietário divergentes; `initialize`
confere `current_database` e owner marker. Stop/start mantêm volume, identidade e histórico.
A limpeza exige confirmação literal do projeto e prova de propriedade; só a rejeição segura
foi testada, sem apagar o laboratório novo. A rede Compose inerte não é removida pelo cleanup.

`/homologacao/carteirinhas` existe somente na fixture de testes. Reutiliza consentimento privado
revogável, Host/Origin/porta/site exatos, cookie HttpOnly/SameSite Strict, lease e no-store.
POST exige Origin e cabeçalho próprios; GET sem sessão, query estranha, método inadequado,
origem forjada e sessão encerrada são negados. Limite local 60 requisições/minuto por sessão.
Há somente pessoas sintéticas conhecidas; não é endpoint de consulta/emissão clínica real.

O novo banco persiste cadastro sintético fechado, emissões, revisões e revogações. Não persiste
atendimentos, configurações ou checklists da Vitrine: esses continuam em memória. Novas pessoas
arbitrárias digitadas no wizard não são provisionadas nesse banco. Nenhum “salvo no banco” é
exibido para tais cadastros/atendimentos. O emissor legado `pap-id:demo` continua baseado em
manifesto; neste roteiro, usar `review-lab.mts --action issue` para compartilhar a base da UI.

Rotas clínicas reais, IAM, MFA, contas/sessões e guard Comercial permaneceram sem mudanças.
O standalone foi construído e iniciado fora da worktree: endpoints privados, inclusive o novo
emissor, retornam 404 HTTP/RSC/POST, mesmo com flag privada indevidamente ligada; Vitrine sem
sessão redireciona login. Ausência de conexão operacional é imposta por URL inválida em loopback.

## Fontes e curadoria

Leitura da extração textual de todas as 25/34/36 páginas, com conferência visual dos fluxogramas
originais e figuras/tabelas rasterizadas relevantes. Hashes de texto por página e páginas visuais
inspecionadas constam de `evidence/source-reading.json`. Não é validação clínica qualificada.
Os três SHA-256/tamanhos conferem exatamente; nenhum PDF foi reescrito, deduplicado ou movido.

- Hipertensivas v01: objetivo p2; população p4; checklist pp14–16, trechos na p15; kit pp20–21;
  fluxograma p22. As tabelas/condutas não foram convertidas em regras. Divergências entre texto,
  tabelas e representações farmacológicas precisam de revisão clínica, não correção automática.
- HPP v03: objetivo/responsabilidades p4 em diante; etiologia pp18–19; definição p22;
  manejo pp24–28; kit pp30–31 e anexo p34; fluxograma p32. Diferenças de apresentação dos
  critérios entre seções 7 e 8 e figura p21 identificada como criada por IA são pendências da fonte.
- Sepse v2 (2025): objetivo p3, critérios p6, kit p8, monitoramento p13, fluxo p15, caixa p16,
  ficha p17. Texto das digitais18–34 é idêntico ao das1–17;35–36 são certidão. Códigos de capa e
  cabeçalho e numerações de sumário/corpo divergem; tabelas/escalas também requerem curadoria.
  Nada foi harmonizado automaticamente, nem omqSOFA trocado por MEOWS.

Trechos transcritos são parciais e identificados com fonte; o PDF íntegro prevalece como documento
original para revisão. Não se declara aplicabilidade assistencial de qualquer trecho. A restrição
“reprodução com fonte e sem fins lucrativos” da Sepse não autoriza automaticamente distribuição
comercial. Downloads continuam privados, com verificação dos mesmos bytes em cada requisição.

## Testes e evidências executados

| Verificação/comando | Resultado real | Evidência |
|---|---|---|
| `node --import ./tests/protocols/load.mjs --test tests/pap-id/*.test.mjs tests/protocols/*.test.mjs tests/vitrine-premium/*.test.mjs` | PASS107/107,0 skips | node-final.log |
| `tsx --test tests/commercial-beta/availability.test.ts tests/commercial-beta/rsc-metadata.test.ts tests/mission04-e/rsc-dynamic-metadata.test.ts` | PASS11/11 | commercial.log |
| `PAP_ID_REVIEW_PROFILE=<perfil próprio> tsx --test tests/pap-id/database.test.mts` antes do quarto caso | PASS3/3: transações/concor­rência, fronteira privada e stop/start | database-final.log |
| Mesmo runner, filtro `--test-name-pattern='profile guards reject'` após adicionar o quarto teste | PASS1/1 adicional,0 skips | profile-guards.log |
| Browser integrado estável, um worker, zero retries | PASS17/17 antes da compactação final | browser-final.log |
| Browser afetado pela compactação final, seis testes únicos | PASS5 na rodada +1 reexecutado após corrigir seletor histórico do teste | browser-compact.log / browser-negative.log |
| TypeScript `tsc --noEmit` após alterações finais | PASS | typescript-final.log |
| ESLint dirigido aos arquivos/pastas afetados | PASS,0 erros/avisos | lint-final.log |
| `npm run build -- --webpack`, URL DB inválida e e-mail desabilitado | PASS no código final da aplicação | build-final.log |
| `node tests/pap-id/production-boundary.mjs` | PASS: build/artefato/HTTP/RSC/login/privacidade, incluindo nova rota | production-boundary.log |
| `git diff --check`, revisão de escopo e segredos | PASS | manifest.json |
| CI remoto, F03/F04 integrais, auth/IAM com DB operacional, scanners/imagens de release | NOT RUN nesta correção local; sem push/novos gates globais | não substituídos por resultados antigos |
| Limpeza destrutiva do banco novo | NOT RUN intencionalmente | rejeição de confirmação incorreta PASS |
| Homologação humana/WSL e revisão clínica/institucional/direitos públicos | BLOCKED/PENDING externo | decisão do operador e revisor habilitado |

Total Node/SQL: **122 testes únicos** (107+11+3+1), não somar repetições. Browser:17 cenários
integrados, seis afetados revalidados após a alteração final de apresentação. Os11 demais
preservam o mesmo conteúdo relevante; não foram repetidos sem necessidade. Testes antigos de
zoom do diagrama genérico foram substituídos por contrato da figura original/capacidade privada;
zoom, páginas e download do leitor real continuam cobertos. Nenhuma asserção IAM/MFA foi removida.

### Falhas intermediárias, preservadas e resolvidas

- Primeira rodada de navegador:13 PASS/1 FAIL (`SyntaxError` em estados). Havia edições em curso;
  ela não foi usada como gate final. Rodada estável posterior passou17/17, inclusive esse cenário.
- Após a compactação, o teste negativo buscava “Digitar código” onde agora existe “Digitar outro
  código”. Atualizado somente o seletor e repetido: PASS; asserts de credenciais revogadas,
  expiradas, malformadas e ausência de ações protegidas permanecem.
- Executor restaurado perdeu dependências que antes estavam em /tmp. Instalação própria em /tmp
  pelo lockfile, sem alterações de versões. Prisma generate precisou do engine já instalado
  devido a403 na origem do checksum; nenhum checksum foi ignorado e nenhum banco conectado.
- Build com `.next` deslocado por symlink não resolvia o runtime Next a partir de /tmp. Restaurado
  o diretório físico e repetido: PASS. Não houve correção no produto para esconder esse erro.

## Capturas e privacidade

Oito capturas novas selecionadas em `evidence/`: fila e confirmação desktop/mobile, conteúdos
reais dos Protocolos. Viewports adicionais320/375/390/430/768/1440, dark mode, teclado e Axe
continuam na suíte integrada. PDFs/PNGs de credencial privados não são anexados ao relatório.
As capturas do leitor na bateria privada mascaram somente o canvas no screenshot, não na UI.
Não há token, senha, segredo MFA, cookie ou dado clínico real nas evidências selecionadas.
Manifesto lista os arquivos e hashes; credenciais/compose/PNG ficam exclusivamente em `.local`.

## Preservação, riscos e homologação

**Nenhum recurso do laboratório manual3600/15436 foi acessado ou alterado.** Não foram lidos
.env, bancos, volumes, credenciais, contas, sessões ou chaves MFA do operador. Não houve VPS,
Nginx, produção, e-mail externo, merge, publicação, alteração de APIs clínicas ou migrations.
Cursos/Chat continuam Em breve; motor MEOWS operacional não foi habilitado.

A infraestrutura do executor foi reconectada; antigas worktrees em /tmp já estavam ausentes.
Seus registros Git foram preservados, sem prune, reset ou clean. A nova worktree foi criada
em /workspace para estas correções; worktrees existentes em /workspace permaneceram intactas.

Riscos residuais: fixture privada é ambiente técnico de consulta sintética, sem autenticação
clínica; não expor em0.0.0.0/túnel/VPS. Contadores UX e confirmação documental demo não são
controle clínico. Histórico de emissão tem limite de50 por pessoa; limite explícito, sem apagar
histórico. Curadoria clínica e direitos continuam bloqueadores de publicação. Dependências não
foram atualizadas; auditorias completas não foram reexecutadas e riscos herdados do relatório
anterior continuam pendentes de tratamento próprio.

Comandos completos de obtenção via bundle, criação/retomada do banco, UI, CLI e descarte seguro:
[WSL.md](WSL.md). Parar para homologação humana; sem push ou implantação.
