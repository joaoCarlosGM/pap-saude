# Ajustes pós-homologação — PAP-ID, Protocolos e banco de testes

**Data:** 2026-11-15  
**Branch alvo:** `feature/beta1-pap-id-protocols-integrated-rc`  
**Status:** requisitos aprovados para correção pelo Codex, NÃO código implementado. **Sem deploy, merge nem alteração de prod/PROD/VPS ou do laboratório persistente.**

## Contexto e causa observada

A primeira homologação conjunta mostrou:
- Identificação PAP-ID poluída e longa: os campos adicionais empurram os controles e exigem rolagem crescente.
- O usuário quer reconhecer **mais de uma carteirinha**, selecionar a pessoa correta e só então solicitar confirmação documental CPF/RG.
- Pacientes já cadastrados não têm ação de emitir/reemitir carteirinha.
- Nas telas de detalhes dos protocolos, falta um botão **Voltar aos protocolos** claro e persistente; o breadcrumb/link atual não basta.
- PDFs reais já podem ser abertos/baixados na fixture privada, mas Visão geral/Fluxograma/Checklist ainda contêm **placeholders documentais**, apesar de os PDFs estarem na branch.
- A **próxima** homologação deve usar PostgreSQL separado e descartável, não o banco atual nem somente DemoProvider em memória.
- Tudo o mais, inclusive Cursos e Chat IA "Em breve", tema, cinco etapas, MFA/IAM, serviços clínicos, infraestrutura, visual aprovado dos Protocolos e download privado, deve permanecer intacto.

## Escopo P1 — redesenhar a identificação PAP-ID sem scroll excessivo

Manter a Etapa 1 do wizard (Stepper 1/5), **sem adicionar etapas globais**. Usar um painel com estados exclusivos (não empilhar formulários):
1. **Localizar carteirinha**: CTA principal `Ler QR` e secundário `Digitar código` / `Buscar por CPF`; importar base de homologação de forma secundária e discreta, sem exibir a configuração a cada leitura. Depois da primeira importação, não exigir recarregar a mesma base para cada cartão.
2. **Carteirinhas detectadas**: múltiplos arquivos PNG/códigos numa sessão, por seleção múltipla ou leituras sucessivas. Fila/lista de candidatos sem dados clínicos sensíveis nem exposição de CPF completo. Impedir duplicados por token/identidade, permitir remover candidato, trocar seleção e registrar quantidades sem forçar scroll. O sistema NÃO deve fazer enumeração em massa de identidades, varrer dispositivos sem permissão ou listar carteirinhas de terceiros. Escolher explicitamente uma gestante.
3. **Confirmação documental**: abrir **apenas após** selecionar candidato; CPF ou RG em um campo/modal compacto, com UF/emissor quando necessário. Dados administrativos mascarados; mensagens genéricas e rate limiting de demonstração. QR, CPF e RG não são prova suficiente de autorização clínica real.
4. **Resultado da confirmação**: cartão compacto com status e ações; detalhes em disclosure/modal, não uma lista vertical permanente. Acesso a resumo sintético só após confirmação e contexto válido.
5. **Ações**: prontuário sintético ou novo atendimento, preservando comportamentos anteriores.

Requisitos UX: evitar campos simultâneos irrelevantes; um único passo/estado por vez; conteúdo prioritário visível sem rolagem excessiva em viewport desktop comum (ex.: 768px altura); modal/sheet responsivo; foco, Escape, teclado, contraste AA e erro localizado; mobile pode rolar quando necessário, sem cortar conteúdo ou trap de foco. Não exigir câmera no P1, mas permitir upload PNG e entrada manual; não alegar descoberta NFC/Bluetooth inexistente.

## Escopo P2 — emissão da carteirinha a partir de Pacientes

Adicionar à Vitrine sintética, na listagem/detalhe de **pacientes já existentes**:
- Ação visível `Emitir carteirinha PAP-ID` para paciente sem cartão e `Reemitir carteirinha` para quem possui.
- QR de teste opaco (sem CPF/CNS/PII), validade, revogação e opção de baixar/visualizar a carteirinha PNG para homologação local.
- Um paciente → múltiplas emissões históricas, **uma credencial ativa conforme política**. Reemitir revoga anteriores; repetir não duplica o paciente.
- Emitir pela UI e pela CLI de desenvolvimento deve seguir o **mesmo contrato de credencial e base de testes**, ou declarar explicitamente interoperabilidade e testar. Não inventar que o cartão foi persistido se depender de download/importação manual.
- Autorização demonstrativa não se converte em capacidade de emissão operacional; emissão clínica real exigirá IAM, vínculo e auditoria apropriados.
- Nunca gravar token bruto em log, URL, Git, analytics ou prontuário.

## Escopo P3 — navegação em Protocolos

- Adicionar botão visível `Voltar aos protocolos` no cabeçalho/detalhe, e retorno de contexto ao sair das abas/PDF.
- Voltar deve priorizar navegação à biblioteca e restaurar pesquisa/filtros quando possível; não depender do breadcrumb minúsculo ou novo clique na sidebar; manter deep-links e histórico do navegador.
- Não modificar o layout geral já aprovado; alterar só o controle de retorno. Testar desktop/mobile, teclado e leitor PDF.

## Escopo P4 — conteúdo REAL documentado dos três PDFs

**Caminhos exatos:**
- `docs/protocolos/documentos-originais/sindromes-hipertensivas-gestacao.pdf` — 25 páginas — SHA256 `63a0dc9b93bc3be45632bcf46649c92d7118884135ac2ff8a95aa565830804d1`.
- `docs/protocolos/documentos-originais/hemorragia-pos-parto.pdf` — 34 páginas — SHA256 `f48c79881152eae50e25ebaf8d354f1219db7c8dd9d5c41b8cfb8ff2360337d2`.
- `docs/protocolos/documentos-originais/sepse-obstetrica.pdf` — 36 páginas — SHA256 `5d4e5756b397ade0adc829cca8336eec86db14e955c22a528fa533a9a75f093b`.

**Verificar originais e hashes antes de extrair.** Substituir placeholders da Visão geral por conteúdo documental estruturado, fiel à fonte, como objetivos, escopo, critérios, organização, seções e avisos de aplicabilidade, com **página digital, página impressa, seção e versão**. Priorizar referências e resumos verificáveis; nenhuma seção genérica "Aguardando PDF" quando o documento já existe na fixture autorizada.

- **Fluxograma:** apresentar a figura/documento original na página certa ou sua estrutura fiel com proveniência, claramente rotulada como "fonte em revisão". NÃO substituir por fluxo genérico de leitura, decisões clínicas inventadas ou diagrama assumido correto. Para sepse, tratar divergência de códigos e páginas repetidas e não deduplicar arquivo.
- **Checklist:** extrair e organizar itens presentes no PDF por seção, diferenciando checklist **original transcrito com referência** de checklist **adaptado**, que exige revisão clínica. Não apresentar item de intervenção como ordem aplicável ou como feito pela paciente. Estado interativo pode ser somente consulta/simulação enquanto não aprovado.
- Dosagens, condutas, limiares e prescrições: não inferir, completar nem alterar; se forem necessários na visão estruturada, indicar página original e deixar a publicação/uso assistencial bloqueados até revisão qualificada. Não transformar PDFs em CDS.
- PDF reader e download privativo já implementados devem permanecer funcionando, sem exposição pública.
- Objetivo desta fase: a tela conter **informações REAIS provenientes dos PDFs**, mesmo que com selo "Em revisão", e não apenas o esqueleto visual anterior.

## Escopo P5 — PostgreSQL exclusivo da próxima homologação

Na próxima execução local, criar e usar um banco PostgreSQL **descartável, isolado e próprio**, com volume/porta/nome novos, sem acesso a 15436/5432 persistentes ou aos serviços do operador:
- Compose/project name próprio, volume próprio, usuário DB próprio, credenciais sintéticas de teste geradas/locais, sem reuso de .env/credenciais operacionais.
- Porta de host aleatória ou somente socket/rede privada, sem bind 0.0.0.0; registrar porta efetiva sem expor senha. Sem colisões e sem desmontar outros projetos.
- Usar um schema/adapter/migrations de teste que reflita cadastro, emissão, revogação, reassociação e busca de múltiplos cartões, com transações/idempotência. Reutilizar schema operacional somente se for seguro no ambiente descartável e após identificar migrations históricas destrutivas; nunca migrar contra bancos existentes.
- Fluxo integrado deve persistir **paciente sintética, cartões, revogação e estado de teste**; reiniciar a UI e comprovar persistência no DB efêmero durante a homologação. Diferenciar operações demonstrativas e clínica real.
- Scripts de **start/status/stop/cleanup** próprios e documentados; stop não remove dados, cleanup requer confirmação e deve rejeitar nomes/volumes fora do projeto. Backup/export de teste opcional, sem dados pessoais.
- Emissões via CLI e UI devem conversar com a mesma base de homologação, com isolamento forte de produção; nenhuma rota de homologação disponível em build/deploy real; segurança do endpoint testada para origem, sessão e contexto. Sem dados reais, emails ou MFA fake de produção.
- Se banco descartável não estiver disponível, **marcar homologação P5 como BLOQUEADA**; não regredir silenciosamente para memória e declarar banco testado.

## Critérios de aceitação

- [ ] Usuário abre Registro e lê várias carteirinhas com interações compactas; escolhe uma e só então confirma CPF/RG.
- [ ] Busca por CPF não permite enumerar pacientes sem autorização/contexto; no demo distingue claramente que não autentica.
- [ ] Carteirinha pode ser emitida e reemitida diretamente de Pacientes; imagem/QR utilizáveis na identificação.
- [ ] Reemissão revoga cartão anterior; a mesma gestante não é duplicada.
- [ ] Botão Voltar aos protocolos funciona sem sidebar, preserva contexto quando razoável.
- [ ] As 3 telas Visão geral apresentam conteúdo realmente retirado dos PDFs, com citações por página.
- [ ] Fluxograma/checklist referenciam conteúdo original, não fluxo genérico inventado.
- [ ] Leitor e download de PDF continuam funcionando somente em homologação privada/autorizada.
- [ ] Banco efêmero prova persistência entre reload/restart, emissão, revogação e consulta; laboratório existente não foi acessado.
- [ ] Cursos e Chat IA seguem texto "Em breve" sem rota funcional.
- [ ] Testes Unit/TypeScript/Lint/Browser/DB e validações de segurança PASS com logs; capturas desktop/mobile; relatório PASS/FAIL/BLOCKED.
- [ ] Nenhum deploy, merge, migration em DB persistente, reconfiguração de Nginx ou alteração do LMS operacional.

## Ordem de execução do Codex

1. Confirmar branch HEAD, inventário, diretórios e estado; criar branch de correção a partir da candidata atual, sem force push.
2. Implementar P1/P2/P3, testes e capturas.
3. Implementar P4, conteúdo rastreável; **separar aprovação clínica** e indicar pendências.
4. Preparar P5 em ambiente efêmero e executar testes de persistência isolados.
5. Entregar relatório e comandos WSL sem tocar no laboratório. **STOP para homologação humana e, depois, autorização separada da Vitrine**.

**Preservar o restante.** Não usar esta missão para remodelar dashboards, corrigir avisos históricos fora do escopo, alterar esquema clínico operacional ou subir em produção.
