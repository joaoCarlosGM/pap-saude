# Premium2.0 — candidato demonstrativo para homologação manual

Branch: `feature/prod-vitrine-ui-refresh`. Base: `41d55534615de612164fef7df398724e80678e2b`. Código integrado: `66c12c01dc15fad4cd948264df9f7b4608949559` (`feat(demo): integrate versioned PAP MEOWS across registration and patient history`). O commit seguinte versiona testes, capturas, inventário e este relatório; consultar HEAD remoto da feature para SHA integral da entrega.

## Entrega e decisão

MEOWS integrado em memória no Registro→Resultado→Atendimento→Prontuário→Dashboard, com a fonte única existente, sem alteração de suas55 regras. Tipos preservam classificação detalhada e versão; entradas originais e avaliação são snapshots do mesmo atendimento. Incompletos não têm total definitivo nem entram na categoria de menor alerta. Resultado mostra crítico independentemente, faltantes e erros; nenhum tratamento/encaminhamento é gerado. Correspondência dos grupos está em PAP-MEOWS-DEMO.md. Fixtures antigas explicitamente ilustrativas, sem vitais fabricados, fora da evolução computada.

Correção pontual de sobreposição descoberta pela matriz: o drawer de conversas cobria o botão mobile do menu principal. O botão ganha prioridade somente enquanto conversas estão abertas; abrir menu continua fechando conversas pelo provider existente. Sem redesenho, sem alteração de guards ou dos outros blocos.

**Apto para homologação funcional da demonstração na3400, com bloqueio externo de build e tipografia. NÃO é aprovação de build, P0, uso clínico ou produção.** Não houve PR, merge ou deploy. Não foram acessados/modificados laboratórios3200/3300, credenciais/MFA, bancos, Prisma, VPS, IAM ou CI/CD. Dados exclusivamente sintéticos; navegador da jornada/matriz não fez chamadas `/api/`.

## Verificações reais

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| `npm run test:demo` | PASS76/76 | 55 motor inalterado,6 integração novos,15 existentes |
| `npx tsc --noEmit` | PASS | last-ts.log |
| `npm run lint` | PASS | last-lint.log; caches de diagnóstico fora da árvore |
| runner browser serial completo | PASS6+4/10 | consolidated-browser.log |
| jornada MEOWS após refinamentos textuais | PASS1/1 | meows-final-content.log |
| matriz visual/funcional | PASS1/1;54 capturas | visual-final-content.log, premium2-evidence/matrix.json |
| `git diff --check` e staged check | PASS | conferidos antes de cada commit |
| `npm run build` | BLOCKED, exit1 | produção interrompida ao buscar fontes externas |
| homologação humana / uso assistencial | PENDING / NÃO AUTORIZADO | operador na3400 / validação qualificada externa |

A bateria integrada foi executada após a correção de drawer. Depois foram refinadas somente as cópias de aviso/legenda (não regras ou navegação) e reforçada a captura de console; jornada MEOWS e matriz foram reexecutadas no conteúdo final. Não se reutilizaram testes históricos para declarar novos testes PASS. Os testes Node ficaram idênticos após a execução76/76, bem como suas dependências de cálculo/estado. Hashes em PREMIUM-2-FINAL-EVIDENCE.json.

Primeiro Node após integração revelou expectativa antiga NAO_AVALIADO: atualizada para INCOMPLETO, mantendo asserts de score null, exames não fabricados e históricos. Primeira matriz revelou sobreposição no Chat: corrigida e repetida integralmente. Lint global chegou a analisar caches webpack arquivados dentro de .test-audit; estes foram movidos, preservados, para /tmp/pap-prod-vitrine-private-evidence/navigation-caches, sem alterar ESLint ou suprimir regras. Falhas anteriores continuam em logs privados; somente evidências sanitizadas são versionadas.

### Build e fontes

Comando real `npm run build` falhou em `next/font` na busca de Inter/Geist/Geist Mono em Google Fonts. Consulta independente pública a fonts.googleapis.com retornou `CONNECT tunnel failed, response403` / HTTP403. Não foram removidas proteções TLS, trocadas fontes, instaladas dependências, alterados Docker/CI ou usado mock para declarar sucesso. Build em ambiente com acesso legítimo continua obrigatório; falha externa também impede comprovar integralmente todas as etapas posteriores do build. Erros de código adicionais posteriores não podem ser excluídos somente com esse build interrompido, embora TypeScript/lint tenham passado separadamente.

### Matriz visual e diferenças

320,375,390,430,768,1440px: Dashboard, Pacientes, Atendimentos, Registro, Resultado MEOWS, Chat IA, Configurações, boas-vindas e tutorial.54 PNGs reais e matrix.json versionados. Testes cobrem overflow, menu/drawer, alternância exclusiva, Escape, movimento reduzido, estado compartilhado, cálculo verdadeiro, console.error/pageerror e ausência de APIs clínicas. Bateria integrada também percorre outras páginas e todos os seis alvos do tutorial. Não foi feita certificação WCAG por esses testes.

Inspeção visual direta das capturas mobile de boas-vindas/resultado e desktop do Dashboard, comparadas à referência anterior `evidence/after-dashboard-390.png`: grades, cartões, palette, cinco etapas e componentes preservados. A referência anterior ainda tinha topbar/aviso removidos pelos blocos já aprovados. Diferenças desta continuidade são camposO2, detalhamento/versionamento MEOWS, rótulos de origem/categoria e totais derivados. EixosMEOWS0–21 e pressão ajustados a valores presentes evitam cortar registros; não são mudança de protocolo. Tipografia de fallback já aparece na referência antiga e nas capturas atuais; renderização exata das fontes aprovadas depende do acesso externo. Capturas não são alegação de equivalência pixel a pixel ou aprovação estética humana. O indicador Next de desenvolvimento pode constar nas capturas; o build não foi aprovado.

## Comandos seguros no WSL

Em uma pasta nova, fora dos laboratórios existentes (clone falha se destino já existir; não remover nem sobrescrever o destino):

```bash
cd ~/projetos
git clone --single-branch --branch feature/prod-vitrine-ui-refresh https://github.com/joaoCarlosGM/pap-saude.git pap-saude-premium-3400
cd pap-saude-premium-3400
git rev-parse HEAD
npm ci
ss -ltnp 'sport = :3400'
# Se3400 estiver livre:
npm run dev -- --hostname 127.0.0.1 --port 3400
```

Usar http://127.0.0.1:3400. Sem --webpack, arquivo.env, local:init, local:admin, banco, migrations ou Docker. npm ci é somente para a nova cópia do operador; nenhuma reinstalação foi feita nesta execução. Se a porta estiver ocupada, identificar propriedade antes de qualquer ação; não encerrar processos de outros ambientes. Interromper com Ctrl+C no terminal deste preview; retomar pelo mesmo npm run dev. O estado de demonstração é em memória: reload/reinício/restauração retorna fixtures, não preserva registros entre processos.

Runner opcional em outro terminal com Playwright/Chromium já disponíveis:

```bash
PAP_DEMO_BASE_URL=http://127.0.0.1:3400 node tests/demo/run-browser.mjs
PAP_DEMO_BASE_URL=http://127.0.0.1:3400 node tests/demo/run-browser.mjs --visual
```

PAP_PLAYWRIGHT_MODULE/PAP_CHROMIUM podem apontar às instalações existentes do operador; não instalar automaticamente. Runner possui lock por porta, arquivos serializados e não inicia/encerra servidor.

## Roteiro exato de homologação

1. Abrir3400, ler boas-vindas e percorrer seis etapas; fechar com Escape e reabrir em Ajuda. Testar320/390/1440 e redução de movimento.
2. Em Registro, usar apenas identidade sintética (por exemplo CPF32165498701, Pessoa Sintética, nascimento05/03/1995), DUM desconhecida. Manter cinco etapas.
3. Completo: PAS120, PAD70, FC80, FR14, temperatura37,0, consciênciaAlerta e Ar ambiente. SpO₂98 apenas registrada. Resultado esperado0, sem alerta pelo score (demo), sem parâmetro crítico. Salvar uma vez; botão fica desabilitado. Conferir ficha, Evolução, Atendimento e Dashboard.
4. Novo registro da mesma identidade: PAS160, demais iguais. Resultado3 e parâmetro crítico; nenhuma conduta automática. Conferir histórico com dois registros e mesmoID de paciente.
5. O₂suplementar4,9L/min pontua2;5 ou5,1 pontua3. Ar ambiente pontua0. Campo de fluxo aparece só no modo suplementar. Fluxo0/negativo/inválido é bloqueado; ausência permanece incompleta.
6. Omitir FC ou oxigenação: INCOMPLETO, total—, faltante discriminado; salvar permitido sem categoria falsamente normal. Temperatura37,45 deve bloquear avanço, inclusive se outro componente estiver ausente.
7. No Chat mobile, abrir conversas e depois menu principal: um substitui o outro. Conferir foco/Escape, navegação por cartões e retorno sem perder os registros da aba.
8. Em Configurações, alterar município/UBS fictícios; conferir sidebar. Restaurar demonstração exige confirmação e reinicia somente este estado sintético; verificar que as instâncias3200/3300 continuam intocadas.

Pendências externas: acesso legítimo às fontes e novo build; homologação humana desta feature. Não integrar P0 nem abrir PR sem próxima autorização.

Logs completos privados foram preservados em /tmp/pap-prod-vitrine-private-evidence/premium2-final-run (origem .test-audit desta worktree); caches anteriores permanecem em navigation-caches. Não estão no Git.
