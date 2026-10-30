# Aceite da Beta 1 — etapas, entregáveis e GO/NO-GO

## Entregas por slice e commit

| Slice | Implementação | Testes mínimos | Evidência |
|---|---|---|---|
| A | Design tokens, shell, sidebar, perfil, banners sem pessoas, ajuda/tour | responsive/keyboard/aria, rota auth | 10 capturas, modo light/dark |
| B | Paridade clínica/Vitrine para pacientes, prontuário, atendimento e registro, sem mexer em KPIs | clínica/tenant; regressão de render | screenshots reais com UBS1 e demo |
| C | Admin teal light/dark e navegação Rede→Município→UBS/Hospital→membros/responsáveis | IAM/anti-IDOR/ações Admin | permissões negativas, screenshots |
| D | PAP_MANAGER: inclusão institucional, editor curso, biblioteca, publicação, release | auth/grants e versões | rascunho e publicação auditáveis |
| E | HEALTH_UNIT_ADMIN e MUNICIPAL_ADMIN: catálogo recebido, atribuição a equipe, prazos | tenant/negative, idempotência, notificações | envio 1/TODOS, contas externas recusadas |
| F | Profissional: player HTML5, checkpoints, avaliação, progresso PG, badge, certificados conforme política | reload/restart/race/security | same enrollment and progress |
| G | Docs/backup, CI integral, visual final e GO/NO-GO | CI completo, Docker, Trivy, restore DB temporária | SHA final, run IDs, checklist usuário |

Cada slice: `git add` apenas caminhos explicitamente listados; commit com descrição; push feature só após validação do slice. Não criar outra branch para fugir do histórico da feature. Não mexer checkout WSL existente sem coordenação.

## Cenários de aceite manual no WSL do operador (reuso do laboratório original)

1. Abra **a mesma** origem `http://127.0.0.1:3600/login`, mesmo navegador/perfil. Login com `PAP_ADMIN`, `PAP_MANAGER`, `MUNICIPAL_ADMIN`, `HEALTH_UNIT_ADMIN`, `PROFESSIONAL`, `COMMERCIAL`, `PROFESSIONAL_B` existentes; MFA já configurado; **não pedir QR novamente** salvo fluxos legítimos causados por mudanças do próprio operador.
2. Admin Global: teal light/dark; rede municipal; abrir município e UBS; equipe/responsáveis; sem métricas inventadas; não ler clínica.
3. Manager: cadastrar curso (draft), aulas animadas + quizzes; publicar release a UBS1 e Município Alfa. Não há dashboard administrativo de KPIs. Tentar ativar UBS: negado.
4. Unit Admin UBS1: mesma sidebar clínica do PROFISSIONAL; ver cursos liberados; atribuir obrigatório com prazo a 1 profissional, depois grupo; não editar conteúdo nem ver UBS2.
5. Profissional UBS1: recebe badge Cursos, abre `/cursos`, estuda HTML interativo; barra de progresso salva; F5 e reinício preservam; submeter avaliação; conclusão; prazo no card. Unit Admin vê estado real.
6. Profissional B da UBS2: não vê curso liberado só à UBS1 nem a matrícula do profissional de UBS1. Cursos liberados em nível municipal aparecem como elegíveis conforme ancestry e atribuição correta.
7. Comercial: Vitrine isolada usa 6 cursos fake e progresso fake; nenhuma API de cursos clínicos nem DB real; foto de avatar fictícia; banner sem pessoas; badge Novo ilustrativo claramente demo.
8. Demais rotas: banner abstrato sem pessoas, sidebar agrupada, seletor sem barra vertical, ajuda/tour por papel; Chat IA/Protocolos/Ferramentas reais ainda indisponíveis não oferecem falso serviço.
9. Dashboard: números, gráficos, backend, fórmulas e restrições iguais aos previamente aprovados; só capa/banner/shell mudou.
10. Reinício: pare apenas web, `npm run local:unified -- stop/start/dev` quando apropriado, preservando volume; rever contas/MFA/progresso e amostras. Nenhum reset ou seed.

## GO/NO-GO

**GO para Beta 1 local:** todas as jornadas acima PASS; UI alinhada; CI verde no SHA novo; backups e smoke de restore; contas/MFA preservadas; nenhuma autorização ampliada; testes LMS verdes.

**GO para VPS STAGING:** além disso, auditoria de dependências, Docker/Trivy, inventário VPS somente após autorização, recursos isolados, backups reais e plano rollback. Nenhum passo deste pacote autoriza deploy.

**NO-GO:** quaisquer lacunas de isolamento, perda/recadastro obrigatório de MFA, execução HTML não confiável, progresso falso, CI incompleto, ausência de backup testado ou dashboard modificado indevidamente.

## Próximas missões separadas

- Resend e serviços externos configurados apenas em staging com domínio/certificados/segredos do operador; laboratório `local-demo` permanece isolado.
- Migração do banco antigo de outras instâncias para 3600 somente com plano aprovado separado; não faz parte deste pacote.
- Deploy na VPS requer autorização, isolamento de staging, não confundir branch `prod` que deploya automaticamente.
