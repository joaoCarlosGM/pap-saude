# PAP-B1-UX-04 — Checklist H38–H42 + Agenda

`PASS` somente após executar e registrar evidências. Estado inicial de todos os itens: `NOT RUN`.

## Contrato de referência
- [ ] Skills lidas: pap-saude-concept-fidelity, pap-saude-registration-ux, pap-saude-flow-reveal e três anteriores.
- [ ] Capturas aprovadas disponibilizadas ao executor, comparação lado a lado com a versão entregue; se não, marcar referência visual exata `BLOCKED`.
- [ ] Escopo identificado: módulos permitidos; nenhuma mudança em shell/sidebars/H01–H37 fora de correção estritamente necessária.

## H38 — Vitrine imersiva
- [ ] Paciente fictícia tem consultas, MEOWS **calculado a partir de sinais** sintéticos, tendências, agenda, exames, vacina e PAP-Gest compatíveis.
- [ ] Sem datação absurda (e.g. gestação acima de 45 semanas); dados e datas calculados em função da referência atual da unidade, não data fixa.
- [ ] Zero, incompleto e não avaliado distintos; aviso geral de dados fictícios está presente sem poluir os cards.
- [ ] Visão de PAP-Gest e documentos **inteiramente fictícios e seguros para apresentação** disponível sem habilitar sessão de homologação. Testar garantia de que nenhum documento/QR/endpoint privado real se tornou público; dados privados exigem autenticação válida.
- [ ] Reset dos cenários e recuperação de estado funcionam, sem afetar banco operacional.

## H39 — Datação gestacional
- [ ] DUM, DUM desconhecida, primeiro atendimento preservados.
- [ ] Fonte por ultrassom/exame e DPP conhecida implementadas com proveniência e validação.
- [ ] Calcula IG de hoje, IG histórica e IG de agendamento com referência correta de data civil.
- [ ] Teste DUM 24/07/2026: 13s5d em 28/10/2026, 17s5d em 25/11/2026 e DPP 30/04/2027.
- [ ] Nenhum valor fixo do `DEMO_DATE` usado para datar gestação atual.
- [ ] Retificação de fonte mantém histórico e não substitui DPP médica silenciosamente.

## H40 — Registro Premium
- [ ] Etapa 2 corresponde ao layout descrito, sem perder `primeiroAtendimento`.
- [ ] Etapa 3 possui todos os **13 grupos/contratos** da matriz, inclusive O₂/fluxo, consciência, débito, proteinúria qualitativa e quantitativa.
- [ ] Etapa 4 possui todos os grupos, inclusive SOAP completo e antecedentes G/P/C/perdas.
- [ ] Campos extras do conceito (EVA, glicemia, gêmeos, risco) não entraram sem requisito aprovado.
- [ ] Condicionais, exclusões explícitas, preenchimento incompleto e validação seguem contrato atual.
- [ ] Save/refresh mantém registros; autoria e escopo por paciente corretos.

## H41 — MEOWS
- [ ] Escore em tempo real quando completo, estado incompleto quando faltam dados.
- [ ] Parametrização exata da matriz versionada atual; nenhuma classificação ou dose inventada.
- [ ] Histórico e tendências de casos sintéticos populados, persistência e datas consistentes.
- [ ] Não há avisos técnicos repetidos; identificação geral discreta e auditoria/proveniência acessível.

## H42 — Fluxogramas
- [ ] Três protocolos com mapa de nós/arestas e transcrição fiel ao PDF, sem remoção de ramo.
- [ ] Paleta institucional PAP nos nós; PDF original sem modificação.
- [ ] Animação 0/25/50/75/100, pausa/replay/ver completo, decisões SIM/NÃO e detalhes das caixas funcionando.
- [ ] Mobile, teclado, zoom/pan, tela cheia e movimento reduzido funcionam.
- [ ] Dúvidas clínicas documentais classificadas BLOCKED, não inventadas.

## H43 — Banner Agenda
- [ ] `RouteHero.sections.agenda` adicionado sem alterar outros mapeamentos.
- [ ] `public/brand/banners/agenda.svg` é visualmente o mesmo template de `atendimentos.svg` (mesmo rx20 e 960×220), com ícone calendário.
- [ ] Banner Agenda comparado a Registro/Atendimentos nos viewports 390 e 1440.
- [ ] Header, filtros, compromissos, modais e persistência H35 permanecem inalterados.

## Evidências finais
- [ ] Screenshots 320/375/390/430/768/1024/1440 dos 3 passos de Registro, Agenda e Protocolos.
- [ ] Testes TS + lint + build webpack + suíte unitária + integração + Playwright e isolamento de review/produção.
- [ ] Relatório registra `PASS/FAIL/BLOCKED/NOT RUN` por item, commit remoto, links, anomalias e `NO DEPLOY`.
