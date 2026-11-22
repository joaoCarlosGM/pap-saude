# MISSÃO CODEX — Execução futura das correções de homologação (H01–H17)
**Documento pronto para comando posterior do operador.** **NÃO executar por sua simples presença nesta branch.**

## Identificação
- Projeto: `joaoCarlosGM/pap-saude`.
- Baseline: `feature/beta1-final-local-acceptance-rc`, incluindo os três documentos de 22/11/2026; verificar HEAD remoto/estado antes de qualquer ação.
- Nova branch de implementação sugerida: `feature/beta1-post-acceptance-ux-rc` a partir do HEAD conferido. Não reescrever nem force-push a candidata anterior.
- Referência visual VPS: `0e0a2d816729cd68bebdc6c1a0339b2c8a19b861`, digest `a536276abc4a67335df11d5e54820297d0a49c24d03241cbb02eee02d3384b1c`.
- Vitrine **somente sintética**, sem integração clínica real nem deploy automático.

## Ordem de leitura OBRIGATÓRIA
1. `AGENTS.md` e documentação Next.js realmente instalada em `node_modules/next/dist/docs/`.
2. `docs/release/beta1-final-local/AJUSTES-POS-HOMOLOGACAO-2026-11-22.md` **INTEGRALMENTE**.
3. `docs/release/beta1-final-local/CHECKLIST-ACEITE-POS-HOMOLOGACAO-2026-11-22.md` **INTEGRALMENTE**.
4. `docs/protocolos/PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md`, 9 PNGs `docs/protocolos/referencias/`, fontes `docs/protocolos/documentos-originais/`.
5. `docs/design/pap-id-v1/` e seus 6 PNGs/MD.
6. `docs/release/beta1-final-local/{RELATORIO,HOMOLOGACAO-WSL,HOMOLOGACAO-MOBILE,CHECKLIST-UX,CHECKLIST-SEGURANCA,CHECKLIST-DEPLOY-FUTURO}.md`.
7. Código atual dos módulos Registro/CameraScanner, Documentos/PatientCardIssuer, Protocolos, Sidebar/Perfil/Avisos, atendimento/modal e service SQL privado.

Não usar um relatório antigo de PASS como justificativa para declarar H01–H17 aprovados: são **novos critérios pós-homologação**.

## Objetivo final

Entregar **todas as 17 correções** da Vitrine Premium sem introduzir regressões, com prioridade ao fluxo do PAP-ID e transformação dos PDFs em módulos úteis. A experiência deve ser limpa, moderna, responsiva, com controles efetivos e textos mínimos de homologação.

### Ordem de execução sugerida

**Slice A — PAP-ID, carteira e Documentos (H01, H03, H04, H08, H09, H17).**
- Novidade CRÍTICA: primeiro QR válido e verificado **PARA a câmera**, fecha modal e mostra frente/verso ou miniatura da carteirinha diretamente na Identificação. “Adicionar mais” reabre a câmera por ação explícita; “Continuar” passa para CPF/RG sem pular a visualização.
- Corrigir estados de câmera e mensagens contraditórias (preview preto / “Ativar” / “detectada”).
- Integração da arte final: rosa PAP sólido e texto branco na frente, sem logo; verso branco e QR preto; versão P&B; nome, idade, nº gestação, DPP; dados clínicos datados e minimizados, versão expandida opcional.
- Mover emitir/reemitir/revogar da lista para o prontuário → Documentos; viewer frente/verso, imprimir e baixar PDF/PNG; token opaco e escopo preservados.
- Testes de anti-duplicidade, revogação, print scan, persistência, sessão, mobile e foco.
- Não confundir 2ª gestação com 2º trimestre; não inventar MEOWS/queixa/alergia sem registro válido.
**Gate A:** browser desktop com uma leitura real/simulada, duas carteirinhas e impressão virtual; resultado escrito PASS/FAIL/NOT RUN.

**Slice B — PAP-Protocols (H02, H05, H07, H13).**
- Preservar biblioteca visual aprovada; remover breadcrumb duplicado e manter somente Voltar aos protocolos.
- Converter conteúdo efetivo dos três PDFs em visão geral estruturada, checklist de fonte e fluxograma navegável fiel quando verificável, com nós/arestas/citações página/versão.
- PDF original permanece acessível e byte-idêntico; **não** usar a página inteira do PDF como substituto de fluxograma interativo aprovado. Se transcrição ainda não revisada for insegura, mostrar figura original como fallback rotulado e registrar BLOCKED naquela conversão, sem fabricar condutas.
- Reduzir prosa e erros visuais, testar 7 larguras, temas, teclado, mobile. Evidenciar os nove conceitos e diferenças.
**Gate B:** três protocolos navegáveis com matriz de proveniência e estados específicos por seção, não PASS genérico.

**Slice C — Atendimentos, perfil, notificações, modais e UX geral (H06, H10–H12, H14–H16).**
- Detalhes de atendimento com linha do tempo/eventos realmente registrados e campos sem dados honestos.
- Sidebar profissional organizada; foto demo com upload seguro e fallback.
- Avisos em **Caixa de entrada** com lidos/não lidos, filtros e destinos; sem notificações clínicas falsas.
- Padronizar modais: backdrop/Escape/focus; retirar Fechar redundante; preservar proteção de formulários sujos.
- Retirar faixa fixa “PDFs privados • consulta autorizada” da interface principal e mover mecanismo para Configurações de homologação, **sem** enfraquecer verificação de sessão/consentimento.
- Verificar efeitos de animação em runtime comparados com commit VPS, preservar reduced-motion.
**Gate C:** H06, H10–H12 e H14–H16 reproduzidos com evidência em browser.

**Slice D — Fechamento e isolamento.**
- Executar `npm ci` em checkout isolado, TypeScript, lint, build webpack, testes unitários, e2e e testes privados com banco descartável próprio; idealmente CI do SHA.
- Revisar 100% dos casos do checklist, inclusive contraste, foco, PDF/PNG/QR, persistência, upload anterior, revogação, schema PostgreSQL review, HTTPS celular com CA confiável, teste físico **quando disponível**; senão NOT RUN.
- Verificar standalone/Docker (sem endpoints de homologação ou arquivos `.local` em build público), auth/MFA/guards/36 migrations intactos, no touch 3600/15436/VPS.
- Gerar snapshots de UI e evidências `PASS/FAIL/BLOCKED/NOT RUN` não sensíveis.
- Documentar acesso WSL/Desktop/Mobile e forma segura de retomar profile anterior sem `create` duplicado, reset, prune ou segredo versionado.

## Entregáveis esperados
Criar sob `docs/release/beta1-post-acceptance/`:
- `RELATORIO.md`: HEAD, base, commits e escopo, cada H01–H17, perdas/ganhos e limites;
- `CHECKLIST-RESULTADOS.md`: tabela item→resultado→evidência e aceite manual pendente;
- `COMPARATIVO-VISUAL.md`: referência/screenshot antes/depois, 7 viewports, dark/light, motion;
- `PAP-ID-FRENTE-VERSO.md`: contrato de campos/cálculos/datas, print/PDF/PNG, minimização/privacy;
- `PROTOCOL-EXTRACTION-MATRIX.md`: documento/versão/página digital e impressa/seção/nó/checklist/fonte/estado de revisão;
- `HOMOLOGACAO-WSL.md` e `HOMOLOGACAO-MOBILE.md`: comandos exatos e recuperação de perfil, webcam;
- `SEGURANCA-E-DEPLOY-FUTURO.md`: regressão, direitos, CI e política NO-GO da produção até aprovação;
- `evidence/` capturas/logs sanitizados e manifesto.

## Restrições inegociáveis
- Não tocar `prod`, `PROD`, `develop`, VPS, Nginx/DNS, pap-web, Admin Beta publicado, contas reais, MFA, Prisma/migrations operacionais, banco `127.0.0.1:15436` ou UI `3600`.
- Não usar dados clínicos reais, não iniciar geração de prescrição/CDS, não inventar doses/condutas. Revisão clínica qualificada é gate para uso assistencial; direitos por PDF são gate para redistribuição pública.
- Não criar login/permission bypass em nome de simplificação de textos. Remover AVISOS DA UI não significa remover controle de acesso. Dados sintéticos não viram prontuário real.
- Não inserir PDFs privados de paciente, imagens de cartões ativas, chaves, CA, senha, token QR em Git, logs públicos ou builds.
- Não usar `git reset --hard`, `git clean -fd`, `docker prune`, merge, force push ou deploy.
- Manter Cursos/Chat IA “Em breve”, componentes Premium e motion originais, cinco passos do Registro.
- Se o Codex não conseguir inspecionar as capturas de 22/11 do chat, descrevê-las como **não disponíveis**, usar os requisitos textuais e screenshots existentes no repo; não dizer que as viu.

## Política de publicação da implementação
É permitido **push somente da nova branch de correção** após inspeção de segredos e com commits pequenos. Não criar PR para produção sem ordem do operador. Não fazer deploy. Parar após relatório, links e instruções. Se infraestrutura inviável, concluir o máximo possível e indicar impedimentos reais; não fabricar PASS.

### Mensagem final esperada
- Branch, SHA remoto, lista de arquivos e evidências.
- Matriz H01–H17 com status inequívoco.
- URLs de screenshots documentados e protocolo de teste desktop/celular.
- Diferenças frente ao conceito original e pendências para revisão humana.
- GO/NO-GO **somente para nova homologação local**. Publicação na VPS permanece condicionada a autorização específica.

**Aguardar comando explícito do operador para executar esta missão.**
