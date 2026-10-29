# Continuidade — P0 Premium unificado

Branch `feature/p0-premium-unified-rc`; início `b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a`.
Worktree própria `/tmp/pap-p0-premium-unified`. Especificação lida integralmente.
Nenhuma alteração em outros laboratórios, produção, VPS ou checkout de preview.

| Etapa | Dependência / aceite | Estado |
|---|---|---|
| A | Apresentação compartilhada; shell clínico, identidade e menu autorizados; sem imports sintéticos | PASS dirigido |
| B | Quatro KPIs e gráficos reais; zero/ausência; navegação; MEOWS não homologado | PASS dirigido |
| C | Registro idempotente e listas/fichas reais preservados; Premium sem fixtures | PASS dirigido; E2E pendente |
| D | Admin completo, permissões e tour existentes; áreas por autorização | NOT RUN |
| E | Perfil persistente3600/15436 próprio, marcador, segredos privados, correio local, restart | NOT RUN |
| F | Fontes legítimas locais, build/start, regressões, Playwright, Docker, scanners e CI exato | NOT RUN |
| Release | Arquitetura, evidências, homologação local/VPS e GO/NO-GO | NOT RUN |

Commits/push seletivos apenas nesta feature, após testes pertinentes.
Próxima ação: núcleo de apresentação e shell; reutilizar contratos operacionais.
Sem PR, merge, deploy ou habilitação do MEOWS assistencial.

A: apresentação pura/links por concessão efetiva, identidade/vínculos reais na sidebar e tour clínico via engine existente. 6 testes PASS, next typegen, TypeScript, ESLint direcionado e diff PASS. Browser/release ainda NOT RUN. Dependências existentes reutilizadas por hardlinks, sem instalação.

B: 4/4 testes de perfil/dashboard real PASS em PostgreSQL novo descartável, incluindo dois tenants, vínculo encerrado/inativo, ausência de grants e contagens distintas. Logs privados /tmp/pap-unified-tests-91IEA9. Primeira tentativa falhou por origem CSRF ausente no harness; reteste após configurar a origem exata3110 passou sem alterar asserts/guards. TypeScript/lint PASS. Gráfico mantém zero; recentes navegam ao atendimento real; contrato de apresentação separado de lib/demo.

C: cards de pacientes, detalhes/filtragem/transições reais dos atendimentos, diálogo nativo e entrada entre etapas sem substituir o estado do wizard. Backend e contrato idempotente intactos. 32/32 regressões clínicas/conclusão concorrente/privacidade/MEOWS não homologado PASS em DB descartável; TypeScript/lint PASS. Log /tmp/pap-unified-tests-9Nf4JW/clinical.log. E2E de interação/persistência será executado no consolidado.
