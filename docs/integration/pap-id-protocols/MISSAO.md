# MISSÃO CODEX — PAP Saúde Beta 1
## Integração PAP-ID + PAP-Protocols com PDFs reais e preparação para homologação local

### 1. Objetivo

Implementar e integrar os módulos **PAP-ID** e **PAP-Protocols** em uma versão candidata do PAP Saúde, preservando o trabalho já aprovado e preparando o sistema para homologação local pelo operador.

Esta missão deve entregar uma experiência demonstrativa funcional, incluindo:

- Cadastro e identificação de gestante sintética.
- Emissão de carteirinha PAP-ID de teste pelo terminal WSL.
- Leitura ou inserção do QR Code da carteirinha.
- Validação demonstrativa da identidade.
- Acesso aos estados de prontuário e novo atendimento.
- Biblioteca com três protocolos obstétricos.
- Visualização dos documentos PDF originais.
- Download funcional dos três PDFs, sujeito à autorização de distribuição.
- Telas de Visão geral, Fluxograma e Checklist.
- Cursos e Chat IA identificados como "Em breve", sem navegação.

**Não está autorizado implantar esta versão na VPS nem convertê-la automaticamente no sistema clínico oficial.**

---

### 2. Repositório e branches

Repositório: `joaoCarlosGM/pap-saude`

Branches:

- `feature/beta1-protocols-priority-nav` — implementação aprovada visualmente dos Protocolos P1, PDFs originais, especificações e plano de homologação.
- `feature/pap-id-v1-registro-ux-spec` — seis Markdown e seis imagens PNG do PAP-ID.
- `feature/admin-beta-isolated-deployment` — referência para contratos de autenticação, isolamento e deploy.

**Procedimento obrigatório:**

1. Ler `AGENTS.md`.
2. Fazer fetch das referências remotas.
3. Conferir HEAD, histórico e estado do checkout.
4. Criar uma branch candidata de integração a partir da branch mais atual de Protocolos.
5. Incorporar seletivamente documentação e imagens do PAP-ID.
6. Preservar integralmente a implementação de Protocolos já aprovada.
7. Não sobrescrever modificações locais nem realizar merges indiscriminados.

Nome sugerido:

`feature/beta1-pap-id-protocols-integrated-rc`

Não modificar `prod`, `PROD`, `develop` ou a VPS.

---

### 3. Documentação obrigatória

Na branch de Protocolos:

- `docs/protocolos/PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md`
- `docs/protocolos/RELATORIO-ETAPA-1.md`
- `docs/protocolos/MANIFESTO-PDFS-ORIGINAIS.md`
- `docs/protocolos/HOMOLOGACAO-LOCAL-CONJUNTA-PAP-ID-PROTOCOLOS.md`
- `docs/protocolos/PLANO-CODEX-PROTOCOLS-PAP-ID-CONTROLADO.md`

Na branch PAP-ID:

- `docs/design/pap-id-v1/README.md`
- `docs/design/pap-id-v1/00-referencia-original.md`
- `docs/design/pap-id-v1/01-identificacao-cpf-qr.md`
- `docs/design/pap-id-v1/02-validacao-documental.md`
- `docs/design/pap-id-v1/03-nao-encontrada.md`
- `docs/design/pap-id-v1/04-validada-acoes.md`
- `docs/design/pap-id-v1/05-resumo-clinico-expandido.md`

Utilizar as seis referências PNG do PAP-ID e as nove referências PNG dos Protocolos.

Os PNGs representam a direção visual aprovada. Não utilizá-los como fonte de condutas médicas.

---

### 4. PAP-Protocols — PDFs reais

Os documentos originais estão em:

```text
docs/protocolos/documentos-originais/
├── sindromes-hipertensivas-gestacao.pdf
├── hemorragia-pos-parto.pdf
└── sepse-obstetrica.pdf
```

**Antes de usar qualquer arquivo:**

- Confirmar sua existência e integridade por SHA-256 conforme o manifesto.
- Verificar tamanho, número de páginas, versão e procedência.
- Registrar eventuais inconsistências documentais.
- Conferir autorização de distribuição e disponibilização pública.

#### Funcionalidade obrigatória

Na aba **Documento original**, implementar:

1. Visualizador real de PDF.
2. Navegação entre páginas.
3. Zoom.
4. Indicação da página atual e total de páginas.
5. Botão "Abrir PDF".
6. Botão **"Baixar PDF"** com download verdadeiro.
7. Nome adequado do arquivo.
8. Mensagens claras para documento indisponível ou acesso negado.

O download também deverá estar disponível no card da biblioteca, quando autorizado.

A ação Baixar deve entregar os bytes reais do PDF, com `Content-Type: application/pdf` e `Content-Disposition: attachment`.

Não simular download com `console.log`, links vazios ou PDFs fictícios.

**Segurança e direitos:** se a redistribuição pública não estiver autorizada, os arquivos poderão ser consultados apenas no ambiente local privado de homologação. A rota pública da Vitrine deverá permanecer bloqueada até a autorização correspondente. Não criar endpoint público de download apenas para contornar essa restrição.

Não expor arquivos privados por URLs permanentes, chaves de armazenamento ou caminhos de disco.

#### Conteúdo dos protocolos

Utilizar os documentos originais para preparar a estrutura de:

- Visão geral.
- Fluxograma.
- Checklist.
- Referências e procedência documental.

Toda informação clínica extraída deve manter vínculo com a seção, a página digital e a versão do documento original.

**Não transformar automaticamente o PDF em um protocolo assistencial homologado.** Fluxos, medicamentos, doses, critérios diagnósticos e intervenções dependem de revisão clínica responsável.

Até a homologação, manter indicação explícita de conteúdo em revisão. Não implementar prescrição ou decisão clínica automatizada.

#### Escalabilidade

Preservar a arquitetura reutilizável criada na Etapa 1. A inserção de novos protocolos deverá depender de cadastro e dados estruturados, não da criação de um novo componente React por documento.

---

### 5. PAP-ID — Implementação das telas

Integrar o PAP-ID ao Registro demonstrativo seguindo rigorosamente a documentação e os PNGs.

Implementar:

**Tela 1 — Identificação**

Entrada por carteirinha PAP, QR Code ou identificação demonstrativa.

**Tela 2 — Gestante localizada**

Exibir a identificação sintética encontrada, sem assumir que a leitura do QR concede acesso clínico.

**Tela 3 — Validação documental**

Permitir conferência demonstrativa e tratar divergências.

**Tela 4 — Gestante não encontrada**

Oferecer nova tentativa e caminho para cadastro manual.

**Tela 5 — Identidade confirmada**

Oferecer escolha entre visualizar o prontuário sintético e iniciar novo atendimento.

**Tela 6 — Resumo expandido**

Exibir, com dados fictícios:

- Idade gestacional.
- DPP.
- Última queixa.
- Alergias.
- Último MEOWS.

Os valores devem ser identificados como demonstrativos e apresentar estados de dados indisponíveis quando necessário.

**Preservar o Stepper original de cinco etapas.** Os estados de identificação pertencem à primeira etapa, sem acrescentar etapas artificiais.

---

### 6. Emissão de carteirinha PAP-ID pelo terminal

Criar uma ferramenta local de desenvolvimento, com comando semelhante a:

```bash
npm run pap-id:demo -- --create-patient --issue-card
```

Implementar e documentar o comando verdadeiro no `package.json`.

A ferramenta deverá:

- Criar uma paciente 100% sintética.
- Gerar um identificador aleatório.
- Emitir uma carteirinha de teste com QR Code.
- Salvar a carteirinha em formato visual, preferencialmente PNG ou PDF.
- Indicar o caminho do arquivo gerado.
- Permitir testar identificação válida, cartão expirado e cartão revogado.
- Impedir o uso dessa credencial no ambiente de produção.

O QR não deve conter CPF, CNS ou dados clínicos.

Para a demonstração, criar um mecanismo local controlado que permita identificar a paciente sintética correspondente à carteirinha.

Se houver persistência, utilizar somente banco descartável e isolado. Não utilizar o PostgreSQL persistente do operador.

O sistema deve deixar claro quais ações são demonstrativas e quais já possuem implementação real de backend.

---

### 7. Sidebar — Cursos e Chat IA

Manter exatamente a decisão aprovada:

**Protocolos:** funcionalidade acessível.

**Cursos:** ícone + texto + indicação "Em breve".

**Chat IA:** ícone + texto + indicação "Em breve".

Cursos e Chat IA não devem ter `href`, `onClick` ou aparência de botão.

O acesso direto às antigas páginas demonstrativas também deve apresentar indisponibilidade.

Não remover nem desabilitar o LMS operacional real, que será integrado em outra etapa.

---

### 8. Homologação local conjunta

Preparar uma única experiência de teste para o operador.

O roteiro deverá permitir:

1. Executar o comando de geração de carteirinha no WSL.
2. Obter o QR de uma paciente fictícia.
3. Abrir o Registro do PAP Saúde.
4. Identificar a gestante pela carteirinha.
5. Confirmar a identidade no fluxo demonstrativo.
6. Visualizar o resumo sintético.
7. Escolher prontuário ou novo atendimento.
8. Abrir a biblioteca de Protocolos.
9. Consultar os três protocolos e suas quatro abas.
10. Abrir e baixar cada PDF original quando autorizado.
11. Confirmar que Cursos e Chat IA permanecem indisponíveis.

**Não declarar essa homologação concluída apenas porque os testes automatizados passaram.** O operador realizará a aprovação visual e funcional.

Preparar uma execução local reproduzível e isolada, preferencialmente em porta livre própria, sem alterar a aplicação existente na porta 3600 nem o banco 15436.

Não executar migrations ou seeds em bancos persistentes.

---

### 9. Testes obrigatórios

Executar testes adequados para:

- TypeScript e lint.
- Build de produção do candidato, em ambiente isolado.
- Navegação e responsividade desktop/mobile.
- Registro demonstrativo e QR sintético.
- Cartão válido, expirado e revogado.
- Restauração de estado e ausência de duplicidade.
- Integridade dos PDFs.
- Visualização e downloads autorizados.
- Negação de acesso aos PDFs quando não autorizados.
- Acesso direto a Cursos e Chat IA.
- Regressão do PAP-Protocols P1.
- Regressão do restante da Vitrine.
- Ausência de requisições clínicas reais.
- Acessibilidade e navegação por teclado.

Registrar resultados reais como PASS, FAIL, BLOCKED ou NOT RUN.

Não alegar segurança operacional clínica validada com base apenas nos testes da Vitrine.

---

### 10. Entregáveis

Ao finalizar, fornecer:

1. Branch candidata e SHA.
2. Lista exata de arquivos modificados.
3. Comando funcional de geração da carteirinha.
4. Capturas desktop e mobile do PAP-ID.
5. Evidências dos três PDFs abrindo e sendo baixados no ambiente autorizado.
6. Relatório de testes.
7. Limitações e pendências clínicas.
8. Comandos para o operador executar localmente.
9. Checklist para futura implantação da Vitrine.
10. Plano técnico separado para evolução ao dashboard clínico oficial.

Não configurar nem executar deploy.

---

### 11. Próximas fases — não executar agora

**Fase A — Homologação local:** operador testa PAP-ID e Protocolos integrados.

**Fase B — Publicação na Vitrine Premium:** após aprovação, planejar atualização isolada do Admin Beta/Comercial, com verificação de imagem, SHA, Nginx, autorização de PDFs e regressão de MFA/IAM.

**Fase C — Dashboard clínico oficial:** integração real com pacientes, encontros, unidades, PAP-Link, persistência, auditoria e permissões institucionais. Essa fase exige projeto e homologação próprios.

---

### 12. Restrições absolutas

- Não alterar `prod`, `PROD` ou `develop`.
- Não fazer merge ou deploy automático.
- Não utilizar pacientes reais.
- Não expor credenciais, CPF, CNS ou dados clínicos em QR.
- Não executar scripts destrutivos.
- Não reiniciar containers existentes do operador.
- Não modificar banco, contas ou MFA existentes.
- Não abrir APIs clínicas na Vitrine Comercial.
- Não publicar documentos institucionais sem autorização de distribuição.
- Não afirmar que checklists e fluxogramas são clinicamente homologados.
- Não realizar mudanças na VPS.

**Ao concluir, PARE e entregue o candidato para homologação local do operador.**
