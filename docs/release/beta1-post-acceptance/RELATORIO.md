# PAP Saúde Beta 1 pós-homologação

**Branch:** `feature/beta1-post-acceptance-ux-rc`

**Base remota conferida:** `e1816eda38192720dd7051392a41b6a04f88dd97`

**Código:** `61e39c8ba95d0ea3f900a43312f8f190cf1b0dd6`, `b211f69c2b9cb5b38f90ad122a189c61bc35c11d` e `0ea8d7d86a505fb0d75780ba59a6718937b350b3`. A suíte de histórico passou depois de sincronizar as asserções de navegação em `ee4d30d77550cb815ba6cce21b06fb8b84d841cd`. O SHA remoto da entrega inclui a documentação.

O executor Cloud respondeu aos comandos reais de Git no checkout `/workspace/pap-saude`. O perfil de homologação e o perfil das suítes de persistência usam contêineres descartáveis, distintos dos recursos do operador. Aplicação clínica, IAM, MFA, Prisma operacional e as 36 migrações foram comparados com a base e permaneceram intactos.

O scanner libera a câmera ao capturar e verificar um QR, fecha após aceitação e volta à Identificação. A seleção e a conferência documental continuam explícitas. Documentos concentra emissão, reemissão, revogação, histórico e exportação. Os PNGs cifrados existentes permanecem no perfil próprio. Protocolos oferece mapa consultivo, grupos com proveniência e originais com autorização separada. O perfil, a caixa de entrada e os detalhes de atendimento usam estado e eventos da Vitrine.

A [matriz H01–H17](CHECKLIST-RESULTADOS.md) registra resultados por requisito. O [comparativo visual](COMPARATIVO-VISUAL.md), o [contrato PAP-ID](PAP-ID-FRENTE-VERSO.md) e a [matriz de fontes](PROTOCOL-EXTRACTION-MATRIX.md) documentam as decisões verificáveis. As [evidências](evidence/) incluem os comandos, medições e capturas sem QRs ativos ou documentos privados legíveis.

## Validação técnica

- 107 testes de unidade, 25 de regressão de segurança e 7 de banco isolado passaram. O teste dedicado das exportações também passou.
- A rodada integrada registrou 22 de 25 cenários aprovados. Os três cenários que falharam passaram em repetições focadas. O fechamento após impressão recebeu correção no modal. O teste de histórico passou ao aguardar cada mudança de aba. O timeout da transição de Registro para Atendimentos a 390 px não se repetiu isoladamente. [Navegador](evidence/browser-resultados.txt)
- TypeScript do escopo Vitrine, auxiliares privados e testes alterados passou. Lint passou com quatro avisos preexistentes. O gate do build integral ficou bloqueado na geração Prisma, com HTTP 403 no checksum do motor em `binaries.prisma.sh`. O webpack compilou e a etapa TypeScript reportou o cliente Prisma ausente. Standalone e imagem runtime exigem um build completo.
- PDF A4 colorido e P&B rasterizados a 300 dpi mantiveram o mesmo QR. Chromium validou o fluxo HTTPS isolado com CA explícita, consentimento, recuperação após reinício e revogação de sessão.
- O audit de produção reportou quatro resultados HIGH e nove MODERATE no lockfile preservado. O [relatório de evidência](evidence/verificacoes.txt) identifica os pacotes.

## Nova homologação

**GO para nova homologação privada dos fluxos sintéticos.** O aceite integral permanece com o operador. CI remoto não foi acionado pelas allowlists da branch.

Use o [roteiro WSL](HOMOLOGACAO-WSL.md) e o [roteiro mobile](HOMOLOGACAO-MOBILE.md) com um perfil exclusivo. Webcam física, Android, iPhone, WSL/Windows e impressão em papel precisam de verificação do operador. O uso assistencial dos protocolos e os direitos de distribuição dos originais continuam sujeitos a revisão separada.

## Arquivos modificados pelo código

```text
scripts/private-review/card-image.ts
scripts/private-review/documents.ts
scripts/private-review/registry-api.ts
scripts/private-review/registry-store.ts
src/features/vitrine-premium/components/atendimentos/AtendimentoDetailsModal.tsx
src/features/vitrine-premium/components/configuracoes/ProfileAvatar.tsx
src/features/vitrine-premium/components/configuracoes/ProfilePhotoEditor.tsx
src/features/vitrine-premium/components/configuracoes/ProfileSettings.tsx
src/features/vitrine-premium/components/demo/DemoDialogs.tsx
src/features/vitrine-premium/components/demo/DemoProvider.tsx
src/features/vitrine-premium/components/demo/NoticeInbox.tsx
src/features/vitrine-premium/components/layout/Sidebar.tsx
src/features/vitrine-premium/components/pacientes/CardViewer.tsx
src/features/vitrine-premium/components/pacientes/NewSyntheticPatient.tsx
src/features/vitrine-premium/components/pacientes/PatientCardIssuer.tsx
src/features/vitrine-premium/components/pacientes/PatientList.tsx
src/features/vitrine-premium/components/pacientes/PatientTabs.tsx
src/features/vitrine-premium/components/pacientes/PrivatePatientDocuments.tsx
src/features/vitrine-premium/components/protocolos/OriginalDocumentContext.tsx
src/features/vitrine-premium/components/protocolos/OriginalPdfViewer.tsx
src/features/vitrine-premium/components/protocolos/ProtocolCard.tsx
src/features/vitrine-premium/components/protocolos/ProtocolDetail.tsx
src/features/vitrine-premium/components/protocolos/ProtocolFlow.tsx
src/features/vitrine-premium/components/protocolos/protocols.module.css
src/features/vitrine-premium/components/registro/CameraScanner.tsx
src/features/vitrine-premium/components/registro/steps/IdentificationStep.tsx
src/features/vitrine-premium/components/ui/Modal.tsx
src/features/vitrine-premium/lib/demo-notices.ts
src/features/vitrine-premium/lib/demo-photo.ts
src/features/vitrine-premium/lib/protocol-content.ts
src/features/vitrine-premium/lib/protocol-flow.ts
src/features/vitrine-premium/views/configuracoes.tsx
src/features/vitrine-premium/views/protocolos.tsx
tests/pap-id/card-exports.test.mts
tests/pap-id/final-acceptance.spec.ts
tests/pap-id/final-visual.spec.ts
tests/pap-id/fixture/PrivateReviewBridge.tsx
tests/pap-id/integrated.spec.ts
tests/pap-id/mobile-runtime.mts
tests/pap-id/post-homologation.spec.ts
tests/protocols/catalog.test.mjs
tests/protocols/journey.spec.ts
tests/protocols/sourced-content.test.mjs
```
