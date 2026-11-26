# PAP-B1-UX-04 — Matriz de preservação de campos do Registro

**Objetivo**: aplicar UI/UX aprovada sem perda ou reinterpretação dos contratos da branch `feature/beta1-ux-final-h29-h37-rc`. Fonte de dados: `src/features/vitrine-premium/types/registration.ts`, `steps/{PregnancyStep,VitalSignsStep,ObstetricStep}.tsx`, `ClinicalHistory.tsx`, `RecordFields.tsx`, `SoapNotes.tsx`. Esta matriz não autoriza alterar valor de enum, dados legados ou validação.

## Etapa 2 — Gestação (preservar + adicionar datação opcional por fonte)

| Campo/estado | Binding atual | UI aprovada | Operação/validação |
|---|---|---|---|
| Primeiro atendimento desta gestação? | `primeiroAtendimento: boolean|null` | Botões Sim/Não compactos abaixo da datação | Não remover, manter null quando não informado |
| DUM desconhecida | `dumUnknown?: boolean` | Estado claro na seleção de fonte/checkbox acessível | Quando desconhecida, não equiparar a DUM negativa, nem gerar DPP |
| DUM | `dum: string` | Campo `type=date` por DUM | Remover `max=DEMO_DATE`, impor apenas data civil admissível relativa ao contexto real |
| IG semanas+dias | `pregnancyFrom(dum)` | Resultado grande ao lado (sem editar se derivado) | Calcular pela fonte de datação adotada e referência civil explícita |
| DPP | `pregnancyFrom(dum).dueDate` | Resultado grande ao lado | DUM+280 quando essa fonte é adotada; outra fonte exige regra/proveniência |
| Trimestre | `pregnancyFrom(dum).trimester` | Badge compacto no painel | Derivado, não escolha livre |
| Ultrassom/exame (NOVO) | Ainda sem campos no `RegistrationData` | Segmento `Por ultrassom/exame`, data, IG na data, tipo e evidência | Contrato explícito tipado, persistente, unit+integration tests; não substituir DUM silenciosamente |
| DPP conhecida (NOVO) | Ainda sem campos no `RegistrationData` | Segmento `DPP conhecida`, data e origem | Requer data/declaração documental, permite calcular idade a partir da datação adotada mas exibe proveniência |
| Data/hora de referência (NOVO) | Hoje/consulta, não mock constante | Legenda curta, não input arbitrário do usuário | Hoje para visão atual, data da visita para histórico, agendamento para projeção |

**Dados do concept sem contrato atual:** pré-natal iniciado, gestação gemelar, alto risco e unidade. **Não criar por decisão visual**. Histórico obstétrico G/P/C/A é existente, porém está na etapa 4. **Não duplicar ou migrar para etapa 2 por conta própria.**

## Etapa 3 — Sinais vitais (TODOS estes campos precisam permanecer)

| Ordem | Campo/contrato | UI aprovada | Detalhe |
|---|---|---|---|
| 01 | `paSistolica` | Card PAS | número inteiro / mmHg |
| 02 | `paDiastolica` | Card PAD | inteiro / mmHg, PAS > PAD quando ambas presentes |
| 03 | `frequenciaCardiaca` | Card FC | inteiro / bpm |
| 04 | `frequenciaRespiratoria` | Card FR | inteiro / irpm |
| 05 | `temperatura` | Card temperatura | décimos de °C, entrada decimal pt-BR coerente |
| 06 | `saturacaoO2` | Card Saturação de O₂ | percentual, não score MEOWS diretamente |
| 07 | `oxygenMode` | Campo em `Avaliação complementar` | `unknown` / `air` / `supplemental` |
| 08 | `oxygenFlow` | Condicional sob oxigênio suplementar | L/min, requerido para cálculo completo se suplementar |
| 09 | `nivelConsciencia` | Select em complementares | `alerta`, `confusa`, `sonolenta`, `inconsciente` |
| 10 | `debitoUrinario` | Select em complementares | `normal`, `reduzido`, `ausente` |
| 11 | `proteinuria` | Segmented/select atual em complementares | `nao_realizado`, `negativa`, `tracos`, `1+`, `2+`, `3+` |
| 12 | `proteinuriaMethod` | Condicional quando teste qualitativo realizado | `fita`, `outro`; não inventar modalidade |
| 13 | `proteinuriaLab` | Disclosure Laboratório quantitativo | `value`, `unit`, `date`, `method`, quatro campos preservados |

**Não presentes no código:** glicemia capilar e EVA/dor. Aparecem nas imagens concept, **não são aprovadas como novos dados** por mera presença na arte.

**MEOWS real da Vitrine:** a matriz atual em `lib/demo/meows.ts` consome PAS, PAD, FC, FR, temperatura, oxigenação e nível consciência; `saturacaoO2`, `debitoUrinario`, `proteinuria` são coletados mas não são pontuação direta dessa versão. Não adicionar ao score, alterar cortes ou inventar normalidade. Mostrar `INCOMPLETO` até que dados necessários existam; 0 só com score calculado. Para uso clínico real, a matriz precisa de validação formal externa, não apenas autorização de demonstração.

## Etapa 4 — Dados Obstétricos e Clínicos

| Grupo | Campos atuais | Layout aprovado | Condicionais |
|---|---|---|---|
| Avaliação obstétrica | `alturaUterina` cm; `bcf` bpm; `movimentacaoFetal` presente/reduzida/ausente; `sangramentoVaginal` ausente/leve/moderado/intenso; `pesoAtual` kg | Card `Avaliação obstétrica` esquerdo | Respeitar opções e unidades |
| Edema | `edema` `nao_avaliado`, `ausente`, `1+/4+` a `4+/4+`; `edemaLocations`; `edemaOtherLocation`; `edemaProvenance` | Card `Edema` direito | Localizações somente quando graduado; `Outro` pede descrição |
| Registro | `queixasPrincipais`, `soapNotes`, `observacoesProfissional` legado | Card único `Registro clínico do atendimento` com queixa e SOAP 2×2 | SOAP S, O, A, P e autoria da sessão; não apagar histórico legado |
| Alergias | `allergyStatus`, `allergies[].agent/reaction/notes` | Coluna 1 do card `Alergias/Medicações/Comorbidades` | `sim` abre detalhes, `nao` investigado sem relato, `desconhecido` não investigado |
| Medicações | `medications[].name/dose/frequency/route` | Coluna 2 com lista compacta + editar/adicionar | Não tratar array vazio como "sem medicações"; preservar em nova consulta |
| Comorbidades | `comorbidityStatus`, `conditions[]` | Coluna 3 | `sim` exibe condições, `nao` investigado sem relato, `desconhecido` desconhecido |
| Antecedentes obstétricos | `pregnancies`, `deliveries`, `cesareans`, `pregnancyLosses` | Seção expansível dentro do passo 4 | Não excluir nem renomear de forma que perca os valores; validação de coerência permanece |

**Funcionalidades que ficam fora do redesenho:** Identificação (etapa 1), Resultado (etapa 5), seleção de encaminhamento/desfecho existente, backends e SOAP legado. Apenas adaptar a integração estritamente necessária, sem remover telas. As cinco etapas do wizard continuam.

## Aceite por testes
- Diff de campos: cada binding acima encontrado no JSX/ação e no resumo final após salvar; 100% de cobertura.
- Adicionar/editar/remover em cada subgrupo; voltar passos; não apagar alergia prévia por consulta sem dados; validação do primeiro erro com foco; persistência no laboratório privado quando habilitado.
- DUM hoje, consulta histórica, datação por USG, DPP conhecida, troca de fonte, trimestre, ano bissexto e fuso `America/Belem`/configuração de unidade; sem data fixa.
- MEOWS calculado e incompleto, oxigênio suplementar com e sem fluxo, consciência desconhecida, valores inválidos, prot. laboratório opcional.
- Mobile 320/375/390/430 e desktop 768/1024/1440; sem rolagem horizontal da página.
