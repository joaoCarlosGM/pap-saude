# Homologação privada conjunta — WSL

Use uma cópia NOVA no filesystem Linux do WSL. Não atualizar os checkouts/laboratórios3100,
3200,3300,3500,3600, banco15436, `pap-saude-prod-preview` ou `pap-saude-onboarding`.
Não executar local:init/admin, seed, migrations, db push, Docker ou provisionamento de contas.
Node22.13+ ou24 (testado24.19.0), npm e Git. O modo manual não requer Chromium/Playwright.

```bash
git clone --single-branch --branch feature/beta1-pap-id-protocols-integrated-rc \
  https://github.com/joaoCarlosGM/pap-saude.git pap-id-protocols-homologacao
cd pap-id-protocols-homologacao
npm ci --ignore-scripts
npm run pap-id:demo -- --create-patient --issue-card
npm run beta1:acceptance
```

`npm ci` acima só instala na cópia nova; não foi necessário reinstalar o projeto no executor.
O emissor cria um diretório novo `.local/pap-id-demo-XXXXXX` com permissão700:
`base-sintetica.json` (manifesto de teste com hashes, não banco clínico), `carteirinha.png`
(QR opaco e documentos fictícios) e `.owner`. Arquivos privados600, ignorados pelo Git e pelo
artefato de produção. Não publicar o PNG/base nem colar credenciais em logs ou serviços externos.
O identificador numérico é deliberadamente inválido como CPF real. O RG começa com `DEMO-`.
O comando recusa ambiente de produção/Beta deployment e não conecta a banco.

A aplicação informa `http://127.0.0.1:<porta-livre>/vitrine/protocolos`.
Abra exatamente o endereço127.0.0.1 impresso no navegador do Windows; não trocar por localhost
na barra do navegador. A normalização interna do Next para localhost é tratada separadamente.
Servidor exclusivamente em loopback, porta dinâmica própria, e-mails desabilitados e URL de
banco deliberadamente inutilizável. Não há conta/senha/MFA a provisionar na fixture.
A autenticação e MFA do P0 real continuam preservadas; esta execução não as substitui/valida.

## Roteiro humano

1. Em Registro, conferir o Stepper1–5. Há modos CPF sintético, QR Code e Cadastro manual.
2. No modo QR Code, selecionar `base-sintetica.json` do diretório gerado e depois a carteirinha
   em **Ler carteirinha PNG**. Tudo é lido no navegador, sem upload. Código pode ser digitado se
   obtido por leitor local; não usar serviço externo de decodificação. A câmera não é iniciada.
3. Conferir estado Gestante localizada e documento mascarado, ainda sem resumo/prontuário.
4. Informar documento fictício da carteirinha. CPF aceita máscara; RG exige número, UF e emissor
   impressos (PA/DEMO). Testar divergência e depois marcar a conferência do contexto fictício.
5. Validar, expandir resumo e reconhecer os dados ausentes. Nenhum MEOWS/DPP foi inventado.
6. Abrir prontuário sintético; voltar ao Registro, identificar a mesma carteirinha e iniciar
   atendimento. Percorrer Gestação, Sinais Vitais, Dados Obstétricos e Resultado. Campo ausente
   não vira zero/baixo risco; registro só é criado em memória ao salvar, sem paciente duplicada.
7. Testar Cadastro manual e CPF sem resultado, nova tentativa, reset global e reload.
   Pacientes/atendimentos da Vitrine são memória de aba; o arquivo de teste não é banco clínico.
8. Em Protocolos, usar pesquisa/filtros e quatro abas para cada referência. No controle
   **PDFs privados**, autorizar a consulta local; isto NÃO é licença institucional de distribuição.
9. Abrir Documento original: página/total, anterior/próxima, zoom e texto acessível. Abrir PDF
   em nova aba e baixar arquivo real. O card também baixa. Conferir hashes com o manifesto.
10. Testar os atalhos de procedência: página digital, impressa, seção e versão. Fluxograma e
    checklist estruturados continuam em revisão; o roteiro interativo é somente documental.
11. Encerrar consulta privada; ações somem/ficam indisponíveis e links diretos são negados.
12. Conferir Cursos/Chat IA como texto/ícone Em breve e indisponibilidade por URL direta.
13. Avaliar desktop/mobile, teclado, foco, contraste e Ajuda/tutorial. Registrar aceite humano.

## Expirar, revogar e reemitir sem criar outra gestante

Em outro terminal, dentro desta mesma cópia nova, substituir pelo diretório realmente emitido:

```bash
PAP_ID_DEMO_DIR="$PWD/.local/pap-id-demo-XXXXXX"
npm run pap-id:demo -- --directory "$PAP_ID_DEMO_DIR" --expire
npm run pap-id:demo -- --directory "$PAP_ID_DEMO_DIR" --revoke
npm run pap-id:demo -- --directory "$PAP_ID_DEMO_DIR" --issue-card
```

Executar a operação desejada e **reimportar a base atualizada** no navegador. Reemissão troca
QR e invalida anteriores, preservando subject/documento. Um manifesto antigo não é autoridade
operacional; a revogação demonstrativa é conhecida pelo navegador após reimportação.
Para cenários independentes: `--create-patient --issue-card --scenario expired` ou `revoked`.
Nunca apagar lock/resíduos automaticamente: interrupção da CLI exige inspeção do diretório
próprio; emitir outra base de teste é seguro. Nada disso altera banco/conta do operador.

## Interromper e retomar

Ctrl+C encerra somente a fixture iniciada por esse terminal. Os arquivos de teste permanecem.
Reexecutar `npm run beta1:acceptance`, abrir a nova URL/porta, importar a mesma base e PNG.
Reautorizar PDFs na fixture; concessão é por processo, até2h, e não é cookie de login do P0.
Cartão válido dura24h; expirado pode ser reemitido pelo comando acima. Registros de atendimento
em memória não persistem a restart/reload, conforme escopo demonstrativo.
Aprovação visual/funcional é do operador; automação PASS não equivale a homologação humana.
