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
- [ ] P1/P2: composição visual das referências, fontes reais, PDF/fluxo/checklist.
- [x] M1: origem HTTPS LAN exata, autenticação temporária, expiração/revogação, documentação.
- [ ] R1/S1: execução dirigida, responsividade, acessibilidade, regressões e isolamento standalone/Docker.
- [ ] V2: pacote e checklist de publicação futura, sem execução.
- [ ] Fechamento: inventário/segredos, commits/push somente na candidata e homologação humana.

Próximo passo: estender exclusivamente o adaptador PostgreSQL privado e o contrato sintético.
Câmera/dispositivos físicos e confiança de certificado em Android/iPhone exigem validação externa.

Slice registro/documentos: Node2/2 PASS; browser dirigido1/1 PASS; TypeScript/lint PASS.
Upgrade aditivo no perfil próprio anterior, sem recriar DB/container/volume.
Próximo: câmera, HTTPS móvel e revisão visual. Persistência após restart completo ainda será revalidada no gate final.

Slice câmera/HTTPS: browser câmera2/2 PASS; HTTPS completo PASS com CA explícita e Chromium pinado.
TLS: pareamento, Secure cookie, origem, PDFs originais, cadastro/card/PDF pós-restart, logout e negativas operacionais PASS.
Unidades de segurança24/24 PASS (inclui edge3); Node PAP-ID/Protocolos/Premium107/107 PASS.
Restart PostgreSQL próprio1/1 PASS, comparação integral das linhas e hashes.
Browser integrado em andamento: dois testes novos de evidência precisam ajuste (sentinela oculta deve usar attached; Escape em fullscreen). Regressores existentes já executados seguem preservados.
Dispositivos físicos, confiança da CA e encaminhamento WSL/Windows continuam NOT RUN externo.
