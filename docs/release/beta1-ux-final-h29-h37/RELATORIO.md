# PAP-B1-UX-03 · Refinamento assistencial da Vitrine Premium

Base remota conferida em 25/11/2026 `fe87c57d20e24e9392e6d6274f077931228ecb31` na branch `feature/beta1-longitudinal-record-h23-h28-rc`. A candidata usa `feature/beta1-ux-final-h29-h37-rc`. O executor Cloud iniciou com árvore limpa. A execução usou Node 24.22.3, Next 16.4.2, Chromium 156 e Docker 29.9.2.

## Entrega

- H29 mostra localizações apenas para gradações 1+/4+ a 4+/4+ e limpa campos incompatíveis na gravação. Os registros legados seguem legíveis.
- H30 apresenta autoria sintética informativa e preserva os quatro campos SOAP. O servidor fixa autor e categoria nas novas notas privadas e usa horário próprio. A autoria legada é exibida com os dados já registrados. A missão trabalha na Vitrine sintética. Uma assinatura assistencial exigirá o contexto autenticado da futura integração operacional.
- H31 usa confirmação em primeiro plano, aviso de erro fixo no modal, foco no primeiro campo inválido e rascunho editável após falha de rede.
- H32 instala os cards MEOWS, o calendário assistencial, próximos compromissos e a síntese. Dados cadastrais ficam em Documentos e antecedentes em Obs. Anteriores. A navegação da Timeline acompanha a nova localização dos registros.
- H33 usa avaliações completas e registradas na série e distingue valor zero, medição incompleta e ausência de dados. O resultado calculado no servidor é guardado no evento da consulta. Registros anteriores são reconstituídos com o algoritmo demonstrativo existente.
- H34 usa parâmetros sinalizados da avaliação demonstrativa mais recente, quando completa. Cada item pode ser conferido em **Ver alertas**, com valor e horário. O contador de fixture deixou de aparecer como total assistencial.
- H35 apresenta tabela e cards responsivos, filtros, detalhes e edição em modais. As operações preservam versões da Agenda no laboratório e o histórico local de quem usa o modo demonstrativo.
- H36 liga os ramos documentais verificados nas figuras. As condições ambíguas e os detalhes clínicos permanecem disponíveis no original autorizado para revisão humana.
- H37 emite PAP-Gest após o cadastro confirmado, com recuperação separada. Emissões concorrentes reutilizam a credencial ativa. A aba Documentos exibe a PAP-Gest primeiro e oferece inclusão de PDF em modal.

A lista de código e testes está em `evidence/arquivos.txt`. As mudanças de aplicação se concentram em `src/features/vitrine-premium`, com persistência e emissão em `scripts/private-review`. Os arquivos operacionais, migrações Prisma, PDFs originais, workflows e lockfile coincidem com a base. [Matriz dos requisitos](MATRIZ-REQUISITOS.md)

## Verificações

Passaram 111 testes unitários, 14 testes com PostgreSQL e fluxos privados, TypeScript, lint, build webpack, isolamento do standalone e guard SQL. O lint registrou quatro avisos preexistentes. A rodada completa de Playwright teve 30 PASS e 2 FAIL. A seleção do retorno no mapa e a espera pela navegação para o PDF foram corrigidas no teste. As repetições focadas passaram, cobrindo os 32 cenários distintos da rodada. [Evidência técnica](evidence/verificacoes.txt) · [Execuções Chromium](evidence/navegador.txt)

O cenário adicional de retomada passou após parar e iniciar o PostgreSQL sintético. Uma nova fixture e uma nova sessão Chromium reabriram a mesma ficha, com IDs da Timeline na mesma ordem, histórico SOAP e o compromisso de vacinação.

## Homologação

A comparação visual usa as capturas antes/depois e a descrição aprovada. A imagem original citada pelo documento de referência não consta no material recebido. As verificações em Android/iPhone físicos e WSL ficam a cargo do operador. A homologação clínica dos fluxogramas e do MEOWS permanece pendente. [Comparativo visual](COMPARATIVO-VISUAL.md) · [Matriz dos fluxogramas](MATRIZ-FLUXOGRAMAS.md)

O estado de cada teste está no checklist. Os roteiros permitem reproduzir o ambiente em um checkout e perfil exclusivos. [Resultados](CHECKLIST-RESULTADOS.md) · [WSL](HOMOLOGACAO-WSL.md) · [Aparelho físico](HOMOLOGACAO-MOBILE.md)
