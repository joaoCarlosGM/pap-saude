# Premium 2.0 — Fase 1
Base aef219c97f3dc73640c4ceb508b1c2eb6b2180d5, branch feature/prod-vitrine-ui-refresh. Um agente, sem reinstalação.
Fases 2/P0 e 3/PR não autorizadas. Só feature/push e preview 3400; não tocar 3300/3200, VPS, DB/Prisma, credenciais, MFA, Docker/workflows.
Referência visual reutilizada: docs/vitrine/evidence/after-* (missão anterior). Preservar componentes/cores/grids/rotas.

- [x] A: remover topbar/aviso; perfil institucional central + reset; sidebar branca compacta/footer; mobile/menus independentes.
- [ ] B: superfícies paciente/atendimento/recentes acessíveis e sem eventos duplicados.
- [ ] C: três estrelas #EC268F, movimento reduzido.
- [ ] D: marcador/entrada de páginas/KPIs/contadores/gráficos, sem perder estado nem inventar métricas.
- [ ] E/F: boas-vindas por sessão e tour real em seis rotas; foco, skip, reabrir/resize/mobile.
- [ ] G: componente agnóstico + roteiros/permissões documentados; não integrar ao P0.
- [ ] H: engine puro demo; sete parâmetros/faixas/precedência/incompleto; integrar snapshot, prontuário/KPIs; fronteiras.
- [ ] I/J: Node, TypeScript, lint, build real, browser, seis larguras/capturas, diff/segredos/inventário.
- [ ] Commits seletivos/push feature; relatório; comandos WSL3400; parar para homologação (sem PR).

Dependências: perfil/drawer -> tour; engine -> resultado/histórico/KPIs; testes dirigidos após cada bloco -> fechamento.
Aceite: 20 itens da missão vinculados a evidências. PASS só executado; build/fontes externas e falhas técnicas explicitamente BLOCKED/FAIL.

A: Node11/11, TypeScript, lint, browser1/1 PASS; logs .test-audit/premium2/a-*. Sem reinstalações/banco; perfil central e menus independentes.
