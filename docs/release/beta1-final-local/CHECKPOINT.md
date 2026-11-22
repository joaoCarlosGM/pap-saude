# Beta1 final local — checkpoint

Base `00a4ebabaa38a896561aa91d00c1089412d76c73`, branch `feature/beta1-final-local-acceptance-rc`.
Worktree isolada `/tmp/pap-beta1-final-local`; dependências existentes reutilizadas, sem instalação.
Uma agente; testes dirigidos; sem VPS, merge, deploy ou alterações de bancos/laboratórios operacionais.

- [x] G0: Git limpo da origem; nova worktree/branch; documentação obrigatória lida.
- [x] G0:15 PNGs inspecionados; inventário de dimensões/hashes em evidence/reference-assets.json.
- [x] V1 inventário: motion/shell/dashboard/premium idênticos ao SHA de referência0e0a2d8.
- [x] DB1/ID2: cadastro sintético livre controlado, persistência e idempotência.
- [x] D1: cartões recuperáveis, PDFs privados versionados/arquivados e auditoria demonstrativa.
- [x] ID1: webcam/QR, múltiplos candidatos, permissão e encerramento seguro.
- [x] P1/P2: composição visual das referências, fontes reais, PDF/fluxo/checklist.
- [x] M1: origem HTTPS LAN exata, autenticação temporária, expiração/revogação, documentação.
- [x] R1/S1: execução dirigida, responsividade, acessibilidade, regressões e isolamento standalone/Docker.
- [x] V2: pacote e checklist de publicação futura, sem execução.
- [x] Fechamento: inventário/segredos, commits/push somente na candidata e homologação humana.

Estado: funcionalidades implementadas; consolidar evidência, inventário e entrega para homologação humana.
Câmera/dispositivos físicos e confiança de certificado em Android/iPhone exigem validação externa.

Slice registro/documentos: Node2/2 PASS; browser dirigido1/1 PASS; TypeScript/lint PASS.
Upgrade aditivo no perfil próprio anterior, sem recriar DB/container/volume.
Persistência após restart completo revalidada; câmera, HTTPS e revisão visual implementados e testados.

Slice câmera/HTTPS: browser câmera2/2 PASS; HTTPS completo PASS com CA explícita e Chromium pinado.
TLS: pareamento, Secure cookie, origem, PDFs originais, cadastro/card/PDF pós-restart, logout e negativas operacionais PASS.
Unidades de segurança24/24 PASS (inclui edge3); Node PAP-ID/Protocolos/Premium107/107 PASS.
Restart PostgreSQL próprio1/1 PASS, comparação integral das linhas e hashes.
Browser:19/22 passaram na execução inicial; três falhas localizadas corrigidas e3/3 PASS dirigidos. Sentinela oculta usa attached; contagem aguarda hidratação real; Escape sai da tela cheia. Matriz visual repetida1/1 PASS. Nenhuma asserção removida.
Dispositivos físicos, confiança da CA e encaminhamento WSL/Windows continuam NOT RUN externo.

Build real webpack portátil PASS, usando as mesmas dependências materializadas (sem reinstalação).
Gate standalone agora rejeita links externos; HTTP/RSC privados404 e redirect sem sessão PASS.
Imagem Docker runtime da base pinada + standalone testado: PASS,3939arquivos inspecionados, sem perfil/segredos/PDFs privados, não publicada. Não substitui rebuild multistage/Trivy remoto.
TypeScript PASS; lint geral sem erros,4avisos herdados em testes clínicos não modificados.
Auditoria: produção0HIGH/0CRITICAL e10MODERATE; completa14HIGH/24MODERATE/1LOW (herdados, sem mudança de lockfile).
CI remoto integral NOT RUN: candidata não consta nas allowlists vigentes; nenhum workflow/infra foi alterado.

Fechamento: browser final integral22/22 PASS no código funcional dfb7331. Sessão privada expirada1/1 PASS.
Manifesto/capturas15 sem QR, guias e checklists consolidados. Aguardar somente homologação humana; nenhum deploy/PR.


---

## Atualização de requisitos — 22/11/2026 (APENAS DOCUMENTAÇÃO)

**Atenção:** os PASS e o GO para consulta sintética acima descrevem a candidata técnica **anterior** à rodada de homologação visual feita pelo operador. **NÃO significam que as 17 pendências posteriores tenham sido implementadas ou aprovadas.**

O operador consolidou **17 correções H01–H17** e decidiu preparar uma missão futura de Codex. A última decisão operacional é **H17: primeira carteira válida detectada deve encerrar imediatamente a câmera e apresentar a ilustração do cartão; “Adicionar mais” reabre o leitor somente por ação explícita**.

Ler nesta ordem antes de nova implementação:
1. [AJUSTES-POS-HOMOLOGACAO-2026-11-22.md](./AJUSTES-POS-HOMOLOGACAO-2026-11-22.md) — fonte canônica das 17 decisões UX/funcionais, incluindo protocolos clínicos estruturados, cartão rosa frente/verso, Documentos, caixa de entrada, timeline, modais e redução dos avisos.
2. [CHECKLIST-ACEITE-POS-HOMOLOGACAO-2026-11-22.md](./CHECKLIST-ACEITE-POS-HOMOLOGACAO-2026-11-22.md) — testes e evidências exigidos, estados iniciais NOT RUN.
3. [PROMPT-CODEX-AJUSTES-POS-HOMOLOGACAO-2026-11-22.md](./PROMPT-CODEX-AJUSTES-POS-HOMOLOGACAO-2026-11-22.md) — instruções para execução **somente após novo comando explícito**.

A branch foi atualizada **apenas com documentos de requisitos**; implementação da rodada H01–H17 e testes correspondentes ainda **NÃO FORAM EXECUTADOS**. Não houve mudança de componentes, banco, infraestrutura, VPS nem autorização de merge/deploy por este registro.
