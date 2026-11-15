# PAP SAÚDE — MISSÃO CODEX BETA 1
## Release Candidate Final: PAP-ID, Protocolos, Documentos, Câmera, Responsividade e Paridade Visual com a VPS

**Repositório:** `joaoCarlosGM/pap-saude`

**Branch de origem:** `feature/beta1-post-homologation-fixes`

**Nova branch sugerida:** `feature/beta1-final-local-acceptance-rc`

**Referência visual oficial da Vitrine online:**
- Commit: `0e0a2d816729cd68bebdc6c1a0339b2c8a19b861`
- Branch: `feature/admin-beta-commercial-b1`
- Imagem Docker: `ghcr.io/joaocarlosgm/pap-saude-admin-beta@sha256:a536276abc4a67335df11d5e54820297d0a49c24d03241cbb02eee02d3384b1c`
- Container na VPS: `pap-admin-beta-web-1`

**Status inicial:** implementação autorizada somente em branch isolada e laboratório local. Não há autorização de merge ou deploy.

---

# 0. OBJETIVO E REGRAS GERAIS

Entregar uma candidata integrada para a homologação final do PAP Saúde Beta 1.

A experiência deve funcionar em desktop e celular, com os mesmos padrões visuais, animações e navegação da Vitrine Comercial online, acrescidos dos novos módulos.

O operador precisa conseguir:

1. Abrir a Vitrine no computador.
2. Cadastrar uma gestante fictícia.
3. Emitir sua carteirinha PAP-ID.
4. Encontrar essa carteirinha em Documentos.
5. Visualizar e baixar a carteirinha.
6. Ler QR Code pela webcam do computador.
7. Abrir a Vitrine pelo celular em HTTPS.
8. Ler QR Code pela câmera do celular.
9. Identificar múltiplas carteirinhas sem duplicação.
10. Confirmar identidade por CPF/RG fictício.
11. Abrir prontuário demonstrativo.
12. Enviar documentos PDF para a paciente.
13. Visualizar e baixar esses documentos.
14. Persistir paciente, carteirinha e documentos no banco de homologação.
15. Consultar os três Protocolos com conteúdo extraído dos PDFs.
16. Utilizar fluxogramas, checklists consultivos e leitor PDF.
17. Baixar os três PDFs originais.
18. Experimentar as animações e transições já aprovadas na Vitrine online.

**Não reutilizar o banco de dados operacional nem publicar dados da homologação na VPS.**

A entrega só será considerada pronta para homologação quando os fluxos estiverem implementados e testados. Componentes visuais sem funcionamento real não satisfazem os critérios.

---

# 1. ETAPA G0 — AUDITORIA DO REPOSITÓRIO

Antes de implementar:

- Ler `AGENTS.md`.
- Confirmar estado do Git.
- Confirmar SHA da branch de origem.
- Verificar arquivos não commitados e worktrees existentes.
- Criar a branch candidata sem modificar as anteriores.
- Identificar scripts, rotas, componentes, testes, modelos de dados e fronteiras de segurança.
- Conferir os contratos de Comercial, Admin Beta, MFA e IAM.
- Revisar os relatórios das duas homologações anteriores.

Arquivos obrigatórios:

```text
docs/protocolos/PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md
docs/protocolos/PLANO-CODEX-PROTOCOLS-PAP-ID-CONTROLADO.md
docs/protocolos/MANIFESTO-PDFS-ORIGINAIS.md
docs/design/pap-id-v1/README.md
docs/integration/pap-id-protocols/AJUSTES-POS-HOMOLOGACAO-UX-CONTEUDO-DB.md
docs/integration/pap-id-protocols/post-homologation/RELATORIO.md
docs/integration/pap-id-protocols/post-homologation/WSL.md
```

**Obrigatório:** inspecionar visualmente os nove PNGs de referência dos Protocolos e os seis PNGs do PAP-ID.

Não substituir os conceitos por uma interpretação genérica.

Produzir inventário do que já funciona, o que precisa ser corrigido e o que ainda falta.

---

# 2. ETAPA V1 — PARIDADE COM A VITRINE ONLINE DA VPS

A referência oficial é a imagem de produção Admin Beta/Comercial identificada pelo commit `0e0a2d816729cd68bebdc6c1a0339b2c8a19b861`.

O Codex deverá comparar a experiência aprovada com a candidata de homologação.

## Animações obrigatórias

Auditar e preservar:

- Animação de entrada das páginas.
- Transições de navegação.
- Animações de títulos.
- Entrada progressiva de KPIs.
- Animações de gráficos.
- Transições de cards.
- Microinterações de botões.
- Abertura e fechamento de menus.
- Animações de modais.
- Feedback de carregamento.
- Efeitos de hover/focus.
- Estados de formulários.
- Transições do dashboard.
- Comportamento em modo claro e escuro.

Inspecionar os componentes reais, incluindo:

```text
src/features/vitrine-premium/components/motion/
src/features/vitrine-premium/components/layout/DashboardShell.tsx
src/components/premium/
src/features/vitrine-premium/components/dashboard/
```

Verificar se a fixture de homologação monta os mesmos componentes e estilos da Vitrine Comercial.

### Validação técnica

1. Comparar os arquivos com o commit da VPS.
2. Detectar diferenças funcionais ou visuais.
3. Verificar `prefers-reduced-motion`.
4. Medir transições em execução, não apenas presença de CSS.
5. Testar navegação entre páginas.
6. Registrar comportamento desktop/mobile.
7. Restaurar somente animações ausentes ou regressivas.
8. Preservar acessibilidade e desempenho.

Não copiar indiscriminadamente componentes antigos.

**Aceite:** a Vitrine candidata deve preservar a experiência animada da versão aprovada na VPS, salvo diferenças justificadas e documentadas.

---

# 3. ETAPA P1 — REVISÃO VISUAL DOS PROTOCOLOS

A biblioteca teve sua direção visual aprovada anteriormente, mas os detalhes atuais estão excessivamente textuais e distantes das imagens de conceito.

## Fonte visual obrigatória

```text
docs/protocolos/referencias/
```

Comparar cada conceito com a implementação atual.

Não considerar o trabalho concluído apenas por reproduzir títulos ou informações.

## 3.1 Biblioteca

Preservar:

- Cards.
- Pesquisa.
- Filtros.
- Contador.
- Links diretos.
- Botão Visualizar.
- Botão Baixar PDF.
- Navegação.
- Estados vazios e erros.

Melhorar legibilidade, hierarquia visual e responsividade.

## 3.2 Página de detalhes

Manter as quatro abas:

**Visão geral | Fluxograma | Checklist | Documento original**

Layout esperado:

- Cabeçalho organizado.
- Título do documento.
- Instituição e versão.
- Status documental em um local discreto.
- Ações Abrir/Baixar PDF.
- Coluna principal.
- Resumo lateral no desktop.
- Conteúdo adaptado ao celular.
- Botão visível Voltar aos protocolos.

Não repetir avisos extensos de homologação em todos os cartões.

## 3.3 Visão geral

Utilizar conteúdo verdadeiro dos PDFs:

- Objetivos.
- Escopo.
- Definições.
- Critérios documentados.
- Fatores de risco ou temas apresentados na fonte.
- Organização do protocolo.
- Referências de seção/página.

Apresentação em cards, seções e elementos de consulta bem diagramados.

**Não produzir uma página composta apenas por parágrafos.**

Cada bloco estruturado deve possuir procedência documental.

## 3.4 Fluxograma

Apresentar o fluxograma original, respeitando:

- Etapas.
- Decisões.
- Conexões.
- Legendas.
- Condições.
- Referência da página.
- Ampliação.
- Tela cheia.
- Zoom.
- Navegação por toque.
- Alternativa textual acessível.

Se não existir revisão clínica da transcrição, utilizar a figura original fielmente e sinalizar o estado de revisão.

Não inventar fluxos.

## 3.5 Checklist

Recriar o conceito aprovado com:

- Grupos organizados.
- Itens reais da fonte.
- Checkboxes.
- Referência documental.
- Progresso de leitura.
- Expandir/recolher.
- Limpar marcações.
- Links para o PDF original.

Diferenciar explicitamente itens transcritos e adaptações.

Marcar um item significa somente **li**, não **executei**.

Não implementar prescrição ou decisão clínica automatizada.

---

# 4. ETAPA P2 — PDF DOS PROTOCOLOS

Os arquivos estão publicados na branch:

```text
docs/protocolos/documentos-originais/sindromes-hipertensivas-gestacao.pdf
docs/protocolos/documentos-originais/hemorragia-pos-parto.pdf
docs/protocolos/documentos-originais/sepse-obstetrica.pdf
```

Garantir:

- Verificação SHA-256.
- Metadados corretos.
- Visualizador PDF funcional.
- Navegação por páginas.
- Zoom.
- Abrir em nova aba.
- Download verdadeiro do original.
- Download nos cards e nos detalhes.
- Funcionamento responsivo.
- Mensagens adequadas para indisponibilidade.

Não aceitar download fictício.

### Política documental

O operador autorizou a incorporação dos três documentos ao projeto.

Registrar origem, atribuição e condições de reutilização de cada publicação institucional. Não presumir que acesso público pelo SUS equivale automaticamente a licença irrestrita de redistribuição comercial.

Na homologação privada, manter os downloads funcionais. Para publicação online, criar um gate objetivo de revisão das condições de reutilização, sem ocultar artificialmente funcionalidades já autorizadas para testes locais.

---

# 5. ETAPA ID1 — LEITURA DE QR CODE POR CÂMERA

Implementar leitor de QR Code em tempo real.

## Desktop

Suportar:

- Webcam integrada.
- Webcam USB.
- Permissão de câmera.
- Prévia ao vivo.
- Leitura automática.
- Encerramento seguro.
- Troca de câmera quando aplicável.

## Celular

Suportar:

- Android Chrome.
- iOS Safari, quando houver dispositivo para testar.
- Câmera traseira prioritária.
- Permissão explícita.
- Prévia responsiva.
- Leitura automática.
- Feedback visual e acessível.
- Alternar câmera.
- Pausar/retomar leitura.
- Encerrar câmera ao sair da página.

## Fluxo PAP-ID

1. Selecionar Escanear carteirinha.
2. Abrir câmera.
3. Detectar QR.
4. Consultar o serviço sintético autorizado.
5. Adicionar candidato à lista.
6. Ignorar duplicações.
7. Continuar escaneando outras carteirinhas.
8. Selecionar uma gestante.
9. Solicitar confirmação CPF/RG.
10. Apresentar resultado e próximas ações.

Manter alternativa por PNG ou código digitado.

A UI deve permanecer compacta, sem empilhar formulários.

Nunca transmitir vídeo para serviços externos.

Nenhuma imagem ou frame deve ficar salvo sem finalidade e autorização explícitas.

Não confundir leitura de QR com autorização para visualizar prontuário clínico real.

---

# 6. ETAPA ID2 — CADASTRO E EMISSÃO DE CARTEIRINHAS

O cadastro não pode ficar restrito às três pacientes sintéticas iniciais.

## Gestante não encontrada

Oferecer:

**Cadastrar nova gestante**

Cadastrar informações sintéticas mínimas e persistir no PostgreSQL descartável.

Após salvar:

- Confirmar criação.
- Evitar duplicação.
- Permitir emissão imediata da carteirinha.
- Vincular a carteirinha à paciente.
- Disponibilizar a carteirinha na área Documentos.

## Gestante existente

Na área Pacientes:

- Emitir carteirinha.
- Reemitir.
- Revogar.
- Consultar histórico.
- Visualizar.
- Baixar PNG.
- Exibir validade.

Não criar novo paciente ao emitir outro cartão.

A emissão pela UI e pelo terminal deve compartilhar o mesmo banco e contrato de credenciais.

O QR contém token opaco, nunca CPF, CNS ou dados clínicos.

A credencial de homologação deve ser rejeitada por qualquer aplicação operacional.

---

# 7. ETAPA D1 — GUIA DOCUMENTOS DA PACIENTE

Adicionar uma guia **Documentos** no prontuário demonstrativo.

Dividir o conteúdo em duas categorias:

### Carteirinha PAP-ID

Exibir:

- Carteirinha atual.
- QR Code.
- Data de emissão.
- Validade.
- Status.
- Download.
- Histórico de reemissões.

### Documentos anexados

Permitir:

- Upload de PDF.
- Listagem.
- Visualização.
- Download.
- Categorias documentais.
- Metadados.
- Histórico de versões.
- Arquivamento ou exclusão controlada.

### Regras

- Arquivos vinculados à paciente correta.
- PDFs privados, fora de `public/`.
- Validação de MIME e assinatura.
- Limites de tamanho.
- Nomes de arquivos seguros.
- SHA-256.
- Controle de acesso a cada operação.
- Proibição de path traversal.
- Testes de documentos corrompidos.
- Proteção contra acesso cruzado entre pacientes.
- Persistência após reinicialização.

Para a homologação, usar somente documentos sintéticos ou sem identificação pessoal.

**Não misturar documentos de pacientes com os PDFs institucionais dos Protocolos.**

---

# 8. ETAPA DB1 — BANCO EXCLUSIVO DE HOMOLOGAÇÃO

Reutilizar e ampliar o laboratório isolado implementado em:

```text
scripts/pap-id/review-lab.mts
```

Preservar:

- PostgreSQL descartável.
- Container próprio.
- Volume próprio.
- Porta exclusiva.
- Credenciais próprias.
- Marcador de propriedade.
- Scripts de start/status/stop/cleanup.

Adicionar persistência para:

- Pacientes sintéticas novas.
- Carteirinhas.
- Histórico de emissão/revogação.
- Documentos.
- Metadados.
- Controle de versões.
- Auditoria demonstrativa.

Não reutilizar a base da porta 15436.

Não modificar Prisma/migrations operacionais.

Não utilizar dados reais.

### Persistência obrigatória

Demonstrar:

1. Cadastro de paciente.
2. Emissão de carteirinha.
3. Upload PDF.
4. Encerramento da interface.
5. Reinicialização da aplicação.
6. Reinicialização controlada do container de homologação.
7. Recuperação de paciente, cartão e PDF.
8. Download dos mesmos bytes.

Nenhum teste pode remover ou recriar recursos operacionais.

---

# 9. ETAPA M1 — HOMOLOGAÇÃO POR CELULAR

Preparar acesso HTTPS seguro pela rede local.

O operador deverá conseguir abrir a aplicação no celular e escanear um QR apresentado no monitor do PC.

Requisitos:

- HTTPS para câmera.
- Certificado confiável pelo dispositivo ou solução equivalente segura.
- Endereço LAN ou canal privado autorizado.
- Sessão temporária.
- Expiração e revogação.
- Limitação de origem/rede.
- Controle de acesso.
- Sem exposição de dados clínicos.
- Nenhuma rota operacional liberada.
- Encerramento fácil do laboratório.

Se a implementação antiga da fixture possuir validação de Host/Origin exclusiva de loopback, adaptar a modalidade celular para aceitar estritamente a origem HTTPS autorizada, sem simplesmente desabilitar essas verificações.

Preferir solução local sem dependência pública.

Não expor a fixture em domínio público, proxy aberto ou VPN sem autenticação apropriada.

Entregar comandos WSL e instruções para Windows, Android e iPhone.

---

# 10. ETAPA R1 — TESTES DE RESPONSIVIDADE

Testar:

- 320px.
- 375px.
- 390px.
- 430px.
- 768px.
- 1024px.
- 1440px.

Percorrer:

- Dashboard.
- Registro.
- Identificação PAP-ID.
- Câmera.
- Pacientes.
- Carteirinhas.
- Documentos.
- Upload.
- Visualizador PDF.
- Biblioteca de Protocolos.
- Visão geral.
- Fluxogramas.
- Checklists.
- Sidebar.
- Tutorial.
- Ajuda.

Verificar modo claro/escuro e `prefers-reduced-motion`.

Executar auditoria de acessibilidade e navegação por teclado.

Produzir capturas comparativas com os conceitos originais.

---

# 11. ETAPA S1 — SEGURANÇA E REGRESSÃO

Preservar integralmente:

- MFA.
- IAM.
- Políticas de UBS.
- Contas existentes.
- Admin Beta.
- Comercial.
- LMS operacional.
- APIs clínicas.
- Banco da porta 15436.
- Aplicação da porta 3600.
- Nginx.
- VPS.
- Infraestrutura de produção.

Cursos e Chat IA da Vitrine continuam marcados como **Em breve**, sem navegação interativa.

Testar:

- Sessão expirada.
- QR revogado.
- QR expirado.
- QR malformado.
- Dupla emissão.
- Cadastro duplicado.
- Upload inválido.
- PDF corrompido.
- Acesso a documento de outra paciente.
- Endpoints privados inacessíveis no build público.
- Ausência de tokens/segredos nos bundles.
- Ausência de arquivos privados em imagens Docker de produção.

---

# 12. ETAPA V2 — PREPARAÇÃO PARA DEPLOY FUTURO

Após a homologação, o operador pretende publicar a Vitrine na VPS.

Preparar, mas NÃO executar:

- Plano de build.
- Imagem standalone.
- Inventário de rotas.
- Variáveis necessárias.
- Política de documentos.
- Armazenamento privado.
- Nginx e allowlists.
- Autenticação Comercial.
- Estratégia de atualização.
- Rollback.
- Smoke tests.
- Backup e restauração, quando aplicáveis.
- Análise de compatibilidade com a imagem atual da VPS.

A imagem de referência da VPS é:

`ghcr.io/joaocarlosgm/pap-saude-admin-beta@sha256:a536276abc4a67335df11d5e54820297d0a49c24d03241cbb02eee02d3384b1c`

Não alterá-la.

A Vitrine pública não pode herdar os endpoints de homologação privados nem receber seu banco de teste.

Definir explicitamente quais recursos são demonstrativos e quais serão implementados posteriormente no produto clínico real.

---

# 13. CRITÉRIOS DE CONCLUSÃO

A missão só poderá ser declarada concluída quando houver:

1. Branch candidata própria.
2. Código implementado.
3. Comparação visual com a Vitrine online.
4. Animações preservadas.
5. Protocolos revisados visualmente.
6. PDFs originais com download funcional.
7. Cadastro de gestante sintética nova.
8. Emissão/reemissão/revogação de carteirinha.
9. Carteirinha disponível em Documentos.
10. Upload/visualização/download de PDF.
11. PostgreSQL exclusivo com persistência comprovada.
12. Leitura de QR por webcam.
13. Acesso HTTPS móvel preparado e testado quando possível.
14. Testes automatizados PASS.
15. Capturas de desktop/mobile.
16. Relatório de segurança.
17. Guia WSL.
18. Plano de publicação na VPS.
19. Evidências de não alteração do laboratório existente.

## Entregáveis finais

Criar:

```text
docs/release/beta1-final-local/
├── CHECKPOINT.md
├── RELATORIO.md
├── HOMOLOGACAO-WSL.md
├── HOMOLOGACAO-MOBILE.md
├── CHECKLIST-FUNCIONAL.md
├── CHECKLIST-UX.md
├── CHECKLIST-SEGURANCA.md
├── CHECKLIST-DEPLOY-FUTURO.md
└── evidence/
```

Todos os testes devem constar como PASS, FAIL, BLOCKED ou NOT RUN, com evidência real.

Publicar somente a branch candidata no GitHub, após revisar o conteúdo versionado para evitar segredos e artefatos privados.

Não abrir PR automático para produção.

Não executar merge.

Não realizar deploy.

Não modificar a VPS.

**STOP após a entrega. A próxima etapa dependerá de homologação humana e aprovação explícita do operador.**