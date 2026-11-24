# PAP Saúde Beta 1 — H23–H28: prontuário longitudinal da Vitrine
**Data:** 24/11/2026 · **Branch auditada:** `feature/beta1-post-acceptance-ux-rc` · **HEAD-base observado:** `2ec1f7c52efdc53119062d437c97ae2e8ed8b1c4` (reconferir antes de executar).  
**Estado:** REQUISITOS APROVADOS PARA EXECUÇÃO POR COMANDO POSTERIOR; este documento por si só não inicia a missão nem autoriza deploy.

## 0. Missão e contexto
O operador pediu que tudo que o prontuário exibe como dado registrável possua uma maneira clara de **incluir, atualizar, consultar e preservar a evolução longitudinal**, sem depender de iniciar um atendimento novo para corrigir telefone, lançar vacina ou anexar um exame. PDFs e PAP-ID já dispõem de fluxo privado — reutilizá-lo em vez de criar armazenamento concorrente. **Preservar as nove abas atuais**: Resumo, Timeline, Obs. Anteriores, Evolução, Exames, Vacinação, Medicações, Agenda e Documentos. Não ampliar o escopo para implantação clínica real.

**Status do código conferido em 24/11:** a branch tem implementações de H18–H22 em `components/registro/{RecordFields,SoapNotes}.tsx` e `components/agenda/AgendaPanel.tsx`; não reimplementar nem sobrescrever essas melhorias. As abas `PatientExams.tsx` e `PatientVaccines.tsx` apenas mapeiam arrays; `PatientMedications.tsx` apenas lista; `PatientSummary.tsx` não oferece editor cadastral; `PatientTimeline.tsx` mapeia eventos derivados; `PatientPreviousNotes.tsx` só lê; `PatientEvolution.tsx` lê SOAP de consultas. `lib/demo/data.ts` reconstrói medicações/alergias/comorbidades ao salvar um atendimento, risco de perda de valor anterior. `DemoProvider.tsx` armazena boa parte das consultas somente em React state. `types/paciente.ts` tem tipos simples de exame/vacina/medicação/documento e timeline; novos contratos exigem evolução compatível.

### Mapa de responsabilidade por área
| Exibição existente | Entrada/estado atual | H alvo |
|---|---|---|
| Exames | fixture `patient.exams`, status NORMAL/ALTERADO/PENDENTE; PDF anexável separadamente | H23 |
| Vacinação | fixture `patient.vaccines`, APLICADA/PENDENTE; sem formulário | H24 |
| CPF/nascimento/contatos/CNS/endereço | Registro/Cadastro novos limitados; exibição `PatientSummary` | H25 |
| Medicações | formulário da consulta `ClinicalHistory`; `saveDemo` substitui lista toda | H26 |
| Alergias/comorbidades | perguntas no Registro; `saveDemo` substitui estado atual | H27 |
| Evolução, observações, timeline | resumos derivados de encounters + fixture; não indexa tudo | H28 |
| PAP-ID, PDFs, agenda | partes já implementadas sob contratos separados | integração, não reescrita |

## H23 — Exames estruturados e vínculo de documento [P0]
**Local:** Prontuário → Exames. Prover ações acessíveis `Adicionar exame`, `Registrar resultado`, `Anexar PDF existente`, `Ver detalhes`, `Corrigir registro` e `Cancelar solicitação` quando aplicável.

**Entidades distintas:**
- `ExamRequest`: ID, paciente, consulta/encaminhamento opcional, nome/tipo, solicitação em data/hora, profissional solicitante sintético, prioridade informada (não interpretada clinicamente), situação da solicitação (`solicitado|agendado|coletado|concluido|cancelado`), notas, origem.
- `ExamResult`: resultado identificado, requestId opcional, data de coleta e de resultado, laboratório, método, componentes medidos com valor + unidade + intervalo de referência fornecido no próprio laudo (não inventado), interpretação textual informada pelo emissor, autor/data do registro, estado (`pendente|disponivel|revisado|retificado`).
- `AttachmentLink`: `documentId` do serviço privado existente, `examId/resultId`, paciente e acesso pela mesma autorização do documento. A existência de PDF **não** significa resultado estruturado ou interpretado.

**Comportamento:** criar solicitação sem PDF; registrar resultado depois; anexar PDF do mesmo paciente; visualizar original com controle de acesso; manter versões, retificações e histórico sem exclusão silenciosa. Exibir “Não informado” e valores explícitos; não classificar automaticamente um exame como NORMAL/ALTERADO por limites inventados. Não permitir edição que pareça laudo laboratorial assinado. Exames antigos da fixture permanecem rotulados como ilustrativos e não transformados em resultados reais.

**Cenários:** criar pedido → marcar coletado → registrar resultado → vincular PDF → timeline; pedido sem resultado; documento de paciente B não vinculável ao exame de A; retificação gera evento e mantém versão anterior; reinicialização preserva vínculo.

## H24 — Vacinação longitudinal [P0]
**Local:** Prontuário → Vacinação. Ações `Registrar dose`, `Agendar dose` (integra Agenda), `Atualizar situação`, `Ver histórico`, `Retificar lançamento`.

**Dados:** ID, paciente, imunizante, dose/número, status `aplicada|agendada|pendente|desconhecida|cancelada`, data/hora de aplicação **quando houver**, lote/fabricante opcional, unidade/local, via/lado quando aplicável, responsável sintético e fonte (relato, comprovante, registro da aplicação). Distinguir **declaração de vacinação** de **aplicação registrada**. Intervalo/esquema vacinal automático exige regras versionadas e revisão competente; não inventar doses, datas futuras nem “vacinação completa”.

**Cenários:** lançar dose com e sem lote; agendar sem afirmar que foi aplicada; retificar dose; proteger duplicata por evento/ID e sinalizar coincidência em vez de apagar; preservar vacinas demonstrativas; integração com Timeline e arquivo de comprovante em Documentos se houver. Exibir claramente “Sem informação registrada” versus “Não vacinada” (não equivalentes).

## H25 — Dados cadastrais editáveis e verificáveis [P1]
**Local:** Prontuário → Resumo → Dados pessoais e contatos; CTA discreto `Editar cadastro`, modal ou painel compacto.

**Campos com permissão conforme escopo do demo:** telefone principal, telefone alternativo/contato de referência, endereço estruturado (logradouro/número/complemento/bairro/cidade/UF/CEP), CNS/Cartão SUS fictício opcional e identificador externo demonstrativo se houver. Nome, CPF, nascimento e DUM/IG/DPP requerem fluxo de **retificação controlada**, validação, histórico e confirmação de impacto (p. ex. recalcular DPP somente se fonte obstétrica/critério de datação permitir), não botão livre que muda IDs clínicos. Não fabricar CNS real nem usar CPF real.

**Validação e UX:** formatação de números BR sem restringir DDD a uma cidade; CEP opcional sem API de terceiros obrigatória; texto livre limitado; modal acessível com erro por campo, salvar/cancelar; valores antigos auditáveis; não sobrescrever dado não enviado por campo vazio. Após salvar, a área Resumo e os cabeçalhos vinculados mostram estado coerente; a impressão da carteirinha vigente não deve mudar silenciosamente sem nova emissão explícita.

## H26 — Medicações: reconciliação e ciclo de vida [P0]
**Local:** Prontuário → Medicações; CTA `Adicionar medicação`, ações `Editar`, `Registrar suspensão`, `Encerrar uso`, `Visualizar histórico` e `Informação desconhecida`.

**Dados:** `MedicationEntry` com ID estável por paciente, nome/princípio conforme informado, dose + unidade, via, frequência, início/fim previstos ou reais opcionais, status `em_uso|suspensa|encerrada|desconhecida`, proveniência `relato|registro_profissional|receita_anexada`, autor sintético e data/hora, motivo/texto de alteração sem inferência. Separar **medicação relatada em uso** de **prescrição emitida**: a Vitrine não gera prescrição nem executa dispensação. Campos opcionais permanecem desconhecidos, nunca doses automáticas.

**Bug de dados prioritário:** `saveDemo` atualmente faz `medications:(d.medications||[]).map(...)`, descartando todas as medicações anteriores se nova consulta vier sem entradas. Corrigir com reconciliação explícita: campos *não informados* não são comandos de exclusão; alterações só mediante ação específica, preservar IDs e históricos; não usar índice posicional `med-\${i}` como chave global. Duplicação de registro pede revisão, não descarta silenciosamente.

**Cenários:** 2 medicações prévias → consulta sem novos dados → ambas continuam; suspender uma mantém histórico e exibe status; reiniciar página recupera o estado conforme política de persistência; documento-prescrição opcional é link privado, não substitui cadastro.

## H27 — Alergias e comorbidades: rastreabilidade [P0]
**Local:** Prontuário → Resumo; seções com ação `Gerenciar alergias` e `Gerenciar condições`, sem exigir novo atendimento.

**Alergia:** ID, agente/substância, manifestação/reação, gravidade **relatada** se documentada, confirmação `relatada|confirmada|descartada|desconhecida`, início/última revisão quando disponível, status `ativa|inativa|sob_revisao`, origem e autor. **Desconhecida, não investigada, investigada sem relato e ausência confirmada** não se confundem. “Sem registros” nunca equivale a “Sem alergias”. Mudança preserva o que era conhecido antes; sinalizar informação contraditória sem apagar história.

**Comorbidade:** ID, termo registrado, data de início opcional, situação `ativa|resolvida|em_investigacao|desconhecida`, fonte/autor, revisão. Não inferir diagnóstico a partir de texto livre ou parâmetros. Condições do Registro H20 seguem como origem potencial de registro, mas não substituem uma lista longitudinal.

**Bug de dados prioritário:** `saveDemo` substitui `allergies` e `comorbidities` integralmente por dados da consulta. Desacoplar “não investigado/sem campos” de remoção do histórico. Uma retificação ou descarte deixa evento auditável; atualização precisa evitar conflitos entre consultas antigas e estado atual.

**Cenários:** adicionar alergia → consulta sem alergias novas → alergia continua; atualizar reação sem perder versão anterior; marcar “desconhecido” não apaga evidência prévia; encerrar condição não remove do histórico.

## H28 — Timeline unificada e integridade de fontes [P1]
**Local:** Prontuário → Timeline, Evolução e Obs. Anteriores (preservar as três abas, clareando responsabilidades).

**Fonte de verdade:** eventos registrados por transação, **não** uma lista local duplicada manualmente a cada render. Emitir eventos `created|updated|corrected|status_changed|linked|unlinked` com `eventId`, `patientId`, `entityType`, `entityId`, `occurredAt`, `recordedAt`, `actor` do contexto demo, `source` (`fixture|review|encounter|agenda|document`), `version` e diferença minimizada quando apropriado. Exibir lista cronológica com filtros por Consulta, Exame, Vacina, Medicação, Alergia/Condição, SOAP, Documento, Agenda. Um evento idempotente nunca aparece duplicado em Resumo/Timeline.

**Regras:** notas SOAP e registros anteriores continuam na aba Evolução/Observações; consulta salva cria evento de consulta; exame concluído cria evento de exame; anexar PDF cria evento de vínculo; agenda gera evento de compromisso (sem inventar atendimento realizado); vacina agendada não vira vacina aplicada; edição cria nova versão e registra autor. Ordenar por data real do evento e desempatar por sequência/ID; distinguir data da ocorrência e da entrada. Dados legados da fixture entram como `illustrative`, não criar auditoria fictícia com autor inventado. Documento removido/cancelado preserva tombstone auditável sem expor conteúdo.

**Cenários:** realizar uma ação em cada aba, recarregar, ver Timeline consistente; desfazer/retificar gera evento novo, não apaga anterior; links só abrem recurso do mesmo paciente; filtros funcionam no mobile; ocorrências antigas preservadas com rótulo de origem.

## 1. Arquitetura de persistência, migração e coexistência [OBRIGATÓRIO]
A Vitrine atual tem **três limites diferentes**:
1. `DemoProvider`: pacientes, encontros, SOAP, histórico, alergias e medicações em **estado React** — desaparecem em refresh conforme versão atual; os campos exibidos são parcialmente derivados.
2. Serviço privado `review-lab` / PostgreSQL: pacientes sintéticos, PAP-ID, documentos privados, versionamento; autorização por perfil/sessão.
3. Agenda: storage de navegador, sem equivalência a agenda clínica real.

**Para a missão H23–H28:**
- Preferir um **adaptador de repositório longitudinal demonstrativo** acoplado ao laboratório privado *somente para sessões autorizadas*, com transações, IDs estáveis, idempotência e escopo `patientId`, sem modificar serviço operacional. Dados de fixture de apresentação poderão permanecer em memória quando um laboratório privado não estiver conectado, com etiqueta explícita de não persistência; não afirmar persistência real indevida.
- Antes de escrever schema, auditar os contratos do `scripts/private-review/registry-store.ts`, `registry-api.ts` e `documents.ts` e a política de identidade `review-*`. **Não criar backend público de escrita em `src/app`** para contornar a fixture; não ligar diretamente PostgreSQL da operação.
- Proteger contra IDOR: todo CRUD paciente/arquivo/associação valida sujeito autorizável, sessão privada, método e origem. Reutilizar guards e capacidades da fixture. Operações idempotentes, nunca executar atualização de A em B com `patientId` trocado.
- Desenhar migração **não destrutiva** de estados legados: mapear status `PENDENTE`/`APLICADA`, `NORMAL`/`ALTERADO`, arrays string de alergias/comorbidades, observações legadas, etc. **Não criar equivalências clínicas falsas**: registros sem data/fonte mantêm `legacy_unverified` e exibem lacunas.
- Transições de estado explícitas (e.g. vacina pendente → aplicada exige data de aplicação e origem); anexos PDF seguem no armazenamento privado atual, associar IDs — nunca duplicar bytes em tabelas clínicas de teste.
- **Decisão de escopo para testes:** o Codex deve conseguir executar H23–H28 em fixture com persistência demonstrativa após refresh/restart do processo e do container. Se a arquitetura existente bloquear alguma parte, implementar a camada isolada pertinente e reportar `BLOCKED` com evidências; não fingir que React state atende requisito.
- Rastreabilidade: histórico append-only na fixture, correções por nova versão, operação idempotente com request ID, `occurredAt`/ `recordedAt`, autor do contexto autorizado, segregação de dados de apresentação e `real data`.

## 2. UX e responsividade
- Preservar a paleta/tokens existentes, animações Premium e a identidade aprovada. Não transformar abas em formulários longos; botões primários curtos `Adicionar`/`Editar` acionam modal/painel com etapas progressivas e feedback.
- 320, 375, 390, 430, 768, 1024, 1440px; teclado Samsung/Android e desktop; telas largas com tabelas, mobile com cards, sem overflow global; rolagem/foco/ESC/backdrop compatíveis com modais de leitura e proteção de campos sujos.
- Campos de origem/estado: “Não informado”, “Não investigado”, “Sem registro”, “Pendente”, “Retificado” e “Ilustrativo” usados com semântica correta, sem avisos demonstrativos repetidos em cada componente.
- Ações contextualizadas na aba; confirmação para encerrar/suspender/retificar, erros junto ao campo e estados vazios úteis.
- Não introduzir alertas diagnósticos, prescrição, cálculo de esquemas vacinais, classificação automática de laudos, tomada de decisão clínica, notificações externas ou controle operacional de UBS nesta entrega.

## 3. Regra de preservação H18–H22 e limites operacionais
- Revalidar H18 proteína `Não realizado`, H19 edema graduado/localização, H20 SOAP/autoria, H21 conduta/desfecho, H22 Agenda após H23–H28, sem regravar ou reverter funcionalidades.
- Não tocar `prod`/`PROD`/`develop`, VPS, nginx, pap-web, Admin Beta, banco `127.0.0.1:15436`, porta `3600`, usuários, IAM/MFA e políticas de tenants; `review-lab` somente container/volume exclusivos.
- Não permitir upload de PDF livre no frontend público, nem copiar dados pessoais, senhas, QR ativo, chaves, certificados e perfis privados para Git ou screenshots.
- Garantia de build isolado e boundary standalone/production; nenhuma rota de laboratório em build público.
- Inspeção final por operador antes de qualquer merge/deploy. O Codex poderá publicar **somente uma branch nova de implementação** após testes/evidências, nunca na referência sem ordem específica.

## 4. Critério de pronto
Cada H23–H28 deve ter **código funcional + modelo/persistência quando necessária + teste + evidência**. Não aceitar componente de visualização sem salvar, nem PASS apenas porque a interface abre. Registrar limites reais e pendências `NOT RUN`/`BLOCKED`. O checklist específico e prompt de execução estão ao lado deste documento.
