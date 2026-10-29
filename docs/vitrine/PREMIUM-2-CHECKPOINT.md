# Premium 2.0 — Fase 1
Base aef219c97f3dc73640c4ceb508b1c2eb6b2180d5, branch feature/prod-vitrine-ui-refresh. Um agente, sem reinstalação.
Fases 2/P0 e 3/PR não autorizadas. Só feature/push e preview 3400; não tocar 3300/3200, VPS, DB/Prisma, credenciais, MFA, Docker/workflows.
Referência visual reutilizada: docs/vitrine/evidence/after-* (missão anterior). Preservar componentes/cores/grids/rotas.

- [x] A: remover topbar/aviso; perfil institucional central + reset; sidebar branca compacta/footer; mobile/menus independentes.
- [x] B: superfícies paciente/atendimento/recentes acessíveis e sem eventos duplicados.
- [x] C: três estrelas #EC268F, movimento reduzido.
- [x] D: marcador/entrada de páginas/KPIs/contadores/gráficos, sem perder estado nem inventar métricas.
- [x] E/F: boas-vindas por sessão e tour real em seis rotas; foco, skip, reabrir/resize/mobile.
- [x] G: componente agnóstico + roteiros/permissões documentados; não integrar ao P0.
- [ ] H: engine puro demo; sete parâmetros/faixas/precedência/incompleto; integrar snapshot, prontuário/KPIs; fronteiras.
- [ ] I/J: Node, TypeScript, lint, build real, browser, seis larguras/capturas, diff/segredos/inventário.
- [ ] Commits seletivos/push feature; relatório; comandos WSL3400; parar para homologação (sem PR).

Dependências: perfil/drawer -> tour; engine -> resultado/histórico/KPIs; testes dirigidos após cada bloco -> fechamento.
Aceite: 20 itens da missão vinculados a evidências. PASS só executado; build/fontes externas e falhas técnicas explicitamente BLOCKED/FAIL.

A: Node11/11, TypeScript, lint, browser1/1 PASS; logs .test-audit/premium2/a-*. Sem reinstalações/banco; perfil central e menus independentes.

B/C: browser2/2, TypeScript/lint PASS. Superfícies usam Link único/linhas nativas com teclado e filhos independentes; seis estrelas (três por ícone) #EC268F/reduced-motion.

D: dois testes puros de métricas PASS; browser B/D2/2 PASS, incluindo Tab/Enter real e links independentes. Contador usa valor semântico final e reserva largura; zero permanece zero. Modais em portal para não herdar transformações; teclado/reduced motion navegam nativamente, sem atraso. TypeScript/lint direcionado PASS.

E/F/G: desktop seis etapas PASS1/1; mobile320/390 seis etapas, menu/conteúdo, resize, Escape e reentrada PASS1/1. Tour puro2/2 PASS; TypeScript/lint direcionado PASS. Navegação explícita pelo controller; shell não intercepta portais. Cold route do dev exige até20s no teste (sem remover contrato URL/alvo). H: motor puro55/55 PASS, integração à UI ainda NOT RUN/pendente.
