# PAP Saúde — Checklist de aceite H23–H28
**Criado em 24/11/2026** · Todos os testes abaixo começam em **NOT RUN**. A documentação não comprova implementação.

## Política de evidência
`PASS` somente com execução real (comando, hash do código, teste/navegador, captura sem PII/token ativo). `FAIL` requer reprodução e diagnóstico. `BLOCKED` requer motivo verificável. `NOT RUN` quando não executado. Separar teste automatizado, teste manual desktop/mobile, persistência e segurança. Usuário é aprovador final do produto; testes clínicos/uso assistencial dependem de validação externa a esta Vitrine sintética.

## A. Cenários manuais por aba

### H23 — Exames
- [ ] Criar solicitação sintética em prontuário de paciente A, com nome, data, solicitante e estado.
- [ ] Consultar exame pendente e registrar resultado em outra ação, sem criar paciente/consulta nova.
- [ ] Registrar resultado quantitativo com unidade e intervalo fornecidos; não autodefinir normalidade.
- [ ] Vincular PDF já enviado do **mesmo paciente**; visualizar e baixar sob autorização existente.
- [ ] Bloquear vínculo cruzado de PDF de paciente B com exame de A (API e interface).
- [ ] Retificar resultado preservando versão anterior e evento na Timeline.
- [ ] Status solicitada/coletada/concluída/cancelada coerentes; ausência do resultado distinguida de “normal”.
- [ ] Exames legados da fixture continuam disponíveis com origem e sem falsa proveniência.
- [ ] Após refresh/restart de processo/DB do laboratório, pedido, resultado e vínculo reaparecem.

### H24 — Vacinação
- [ ] Adicionar vacina com dose e data **real de aplicação sintética** na fixture.
- [ ] Diferenciar aplicada, pendente, agendada, desconhecida; sem preencher data de aplicação quando apenas agendada.
- [ ] Informar lote e local opcional, não gerar valores automaticamente.
- [ ] Retificação registra versão e autor, não substitui histórico.
- [ ] Registro consta em Timeline, sem duplicação por recarregar a página.
- [ ] Possibilidade de vincular comprovante do mesmo paciente (se a implementação oferecer).
- [ ] Dados sobrevivem ao refresh e reinício do laboratório próprio.

### H25 — Dados cadastrais
- [ ] Modificar telefone/endereço em Resumo, salvar, abrir e verificar novo valor.
- [ ] Cancelar edição mantém valor anterior.
- [ ] Dados não enviados em patch não são zerados.
- [ ] Campos de identificação fortes (CPF, nascimento, nome, CNS) exigem retificação controlada e justificativa quando aplicável.
- [ ] Não inventar CNS real nem chave operacional.
- [ ] Alterações ficam auditáveis e com origem/autor.
- [ ] Persistência comprovada após reinício do laboratório.

### H26 — Medicações
- [ ] Adicionar medicação relatada, dose/unidade/frequência/via e estado “em uso”.
- [ ] Suspender e encerrar, preservar datas e razões informadas sem prescrever.
- [ ] **Regressão prioritária:** duas medicações existentes → nova consulta com `medications=[]`/não informado → as duas continuam, sem duplicação.
- [ ] Alterar dose cria nova versão/histórico, não apaga dados anteriores.
- [ ] Estado “desconhecido” não equivale a “nenhuma medicação”.
- [ ] Documentos anexos podem ser vinculados sem alegar prescrição autêntica.
- [ ] Atualização de A nunca altera dados de B.

### H27 — Alergias/comorbidades
- [ ] Registrar alergia com agente/reação/fonte; preservar status investigativo.
- [ ] Diferenciar não investigada, sem relato, confirmada e sob revisão.
- [ ] Atualizar reação ou descartar com trilha e versão.
- [ ] **Regressão prioritária:** alergia preexistente → consulta sem nova informação → alergia continua no Resumo/alerta pertinente.
- [ ] Comorbidade ativa → resolvida registra transição, mantém histórico, não apaga.
- [ ] Nenhum valor sem dados deve ser apresentado como “ausente”.
- [ ] Não inferir risco/diagnóstico a partir de dados isolados.

### H28 — Timeline integrada
- [ ] Criar/alterar um exame, vacina, medicamento, alergia, cadastro, SOAP, documento e agenda; conferir eventos **na mesma paciente**.
- [ ] Filtros por categoria, ordem cronológica e `occurredAt` vs `recordedAt`.
- [ ] Evento corrigido preserva origem e mudança, sem duplicação por refresh.
- [ ] Fixture antiga continua rotulada como ilustrativa, sem inventar autor/dados.
- [ ] Links contextuais levam à entidade certa, protegida pela sessão.
- [ ] Registrar evento não marca exame como concluído, vacina aplicada ou consulta realizada por inferência.
- [ ] Refresh e restart preservam a mesma quantidade de eventos (idempotência).

## B. Segurança, continuidade e integridade (OBRIGATÓRIO)
- [ ] Branch de execução foi derivada do SHA correto da base e **não** modifica `prod`, `PROD`, `develop`.
- [ ] Operações são privadas, escopo paciente, origem/método/sessão válidos; IDOR A↔B negado.
- [ ] Sessão vencida/revogada bloqueia criação, edição, consulta e vínculo de PDF.
- [ ] IDs estáveis, alterações idempotentes e eventos append-only/retificações verificadas.
- [ ] Cadastro de gestante sintética nova não causa vínculo a paciente de fixture errada.
- [ ] Dados clínicos sintéticos aparecem como sintéticos; sem acesso a prontuário real.
- [ ] PostgreSQL descartável independente; `127.0.0.1:15436`, UI `3600`, VPS, IAM/MFA sem acesso/mudança.
- [ ] Build público não inclui APIs de homologação, arquivos `.local`, profile/key, upload privado ou acesso ao banco review.
- [ ] Testes de reconciliação `saveDemo`: medicações, alergias, comorbidades e DPP/IG não são apagadas quando campo não foi informado; preservar campos explicitamente alterados sem falsear dados.
- [ ] H18–H22 regressão funcional: proteinúria, edema, SOAP, conduta e agenda.
- [ ] PAP-ID emissão, QR, reemissão/revogação e PDF upload/download continuam funcionais.
- [ ] Protocolos três PDFs e abas preservados; não altera regras clínicas.
- [ ] Restauração do mesmo perfil de homologação não perde dados, nem exige recriar o banco.

## C. Testes por dispositivo e acessibilidade
- [ ] Desktop Chromium 1440 e 1024, teclado, Tab/Shift+Tab, Escape, foco no campo após erro.
- [ ] Android 390 e 430, teclado virtual, modal scroll, selects, date/time, sem overlay em rótulos.
- [ ] Viewports 320,375,390,430,768,1024,1440: layout sem overflow horizontal global, tabelas adaptadas e target touch ≥44px.
- [ ] iPhone/Safari físico se disponível; senão `NOT RUN` declarado.
- [ ] Light/dark, animação reduzida, acessibilidade de mensagens e labels; foto/câmera não deve ser acionada sem intenção.
- [ ] Um registro por aba com anexos, histórico e confirmação de salvamento sem usar dados reais.

## D. Execução técnica mínima
- [ ] `npm ci` e lockfile preservado, Node/Next conforme `AGENTS.md`.
- [ ] TypeScript, lint, build webpack completo; caso geração Prisma falhe, evidenciar erro e resolver em ambiente seguro sem falsa aprovação.
- [ ] Unitários de esquema, normalização, transições, idempotência e reconciliação.
- [ ] Testes de integração API/banco de laboratório, isolamento/IDOR/CSRF/origin/sessão.
- [ ] Playwright jornada integrada: cadastro A → H23–H27 → Timeline H28 → Registro/Agenda/PDF/PAP-ID → refresh/restart; paciente B não contaminada.
- [ ] CI remoto ou execução equivalente explicitamente documentada, nunca presumir CI PASS.
- [ ] `production-boundary` e standalone verificados sem review endpoints/segredos, ou marcados BLOCKED com justificativa.

## E. Matriz de resultados que o Codex deve preencher
| Item | Inicial | Evidência exigida |
|---|---|---|
| H23 | NOT RUN | Criar exame, inserir resultado, PDF, retificação, persistência |
| H24 | NOT RUN | Aplicar/planejar vacina e conservar histórico |
| H25 | NOT RUN | Editar e retificar cadastro com histórico |
| H26 | NOT RUN | Ciclo de medicações e regressão de não apagamento |
| H27 | NOT RUN | Ciclo alergias/comorbidades e regressão de não apagamento |
| H28 | NOT RUN | Timeline unificada, filtros, event sourcing demonstrativo |
| Persistência | NOT RUN | Refresh + restart do app + restart de DB próprio |
| Segurança | NOT RUN | Sessão, paciente A/B, origens, IDOR |
| Regressões | NOT RUN | H18–H22 + PAP-ID + Protocolos + Agenda |
| Mobile físico | NOT RUN | Aparelho/versão/browser, se disponível |
| Build público | NOT RUN | TypeScript/lint/build/boundary |

**Definição de conclusão:** não anunciar GO de deploy com testes H23–H28 isolados. Apresentar veredito separado **GO/NO-GO para homologação privada**, condicionando a liberação assistencial e VPS a gates próprios.
