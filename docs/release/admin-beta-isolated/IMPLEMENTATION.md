# Admin Beta isolado — checkpoint

Base aprovada: `ea6b5f969701c8c44c278aec56019a0211b3cc60`.
Branch: `feature/admin-beta-isolated-deployment`.

- [x] Implementação da allowlist runtime HTTP/RSC/API e filtragem de menus, sem substituir IAM/MFA.
- [x] Compose próprio: loopback3101, PostgreSQL sem porta publicada, redes/volumes exclusivos.
- [x] Preparação privada de segredos, migrator/runtime separados, manifesto das 36 migrations existentes e ACL canônica.
- [x] Provisionamento inicial por stdin; nenhuma senha fixa, fator ou sessão pré-verificada.
- [x] Template Nginx com identidade privada do proxy e logs sem URLs/tokens; sintaxe testada em container isolado.
- [x] Workflow separado com build, integração, scans e publicação exclusivamente Beta SHA.
- [x] Runbook manual, smoke tests, backup/restauração e rollback operacional.
- [x] 6 testes novos + 29 unitários Beta existentes, TypeScript, lint dirigido, auditorias HIGH/CRITICAL e diff-check locais.
- [ ] Gates de imagens de produção, HTTP/MFA/ACL/backup/restart e Trivy: exigir o novo CI; build local BLOCKED (ver REPORT.md).
- [ ] Ativação manual: DNS/TLS/NTP, recursos VPS, smoke e restauração no destino dependem do operador. Nenhum acesso à VPS autorizado/executado.

Não alterar serviços existentes, workflow/Dockerfile original, laboratório3600/15436,
landing, contas, MFA, sessões ou volumes do operador. Não executar merge ou deploy.
