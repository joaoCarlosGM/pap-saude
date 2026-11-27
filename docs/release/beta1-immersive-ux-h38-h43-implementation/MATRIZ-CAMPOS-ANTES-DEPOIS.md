# Matriz de preservação do Registro

Fonte congelada `cfc1a534ca83825eff77f444b4428c83465705bf`. Antes e depois usam o estado `RegistrationData`. A consulta privada grava o mesmo diário versionado por paciente. H39 acrescenta somente a fonte de datação explicitamente autorizada. Os locators preferem os IDs preexistentes ou o rótulo acessível.

| Binding | Rótulo ou valores | Antes → depois | Validação e vínculo | Locator ou prova |
|---|---|---|---|---|
| `cpf`, `nomeCompleto`, `dataNascimento` | CPF, nome completo, nascimento | Identificação → Identificação | Mesmos fluxos QR, CPF e manual. Vínculo por identidade sintética | `#cpf`, `#patient-name`, `#birth-date`, regressão PAP-ID |
| `dum` | Data da Última Menstruação (DUM) | Data do passo 2 → segmento Por DUM | Civil, não futura e até 45 semanas. DPP=280 dias após DUM no cálculo existente | `#dum` |
| `dumUnknown` | DUM desconhecida | Checkbox passo 2 → checkbox no mesmo segmento | Explícito, desabilita e limpa DUM como na base | `DUM desconhecida` |
| `primeiroAtendimento` | Sim / Não / `null` | Campo do passo 2 → cartão Contexto da gestação | Indefinido até escolha, `boolean|null` persistido | `É o primeiro atendimento desta gestação?` |
| `dating` (H39) | DUM, ultrassom/exame com `date,weeks,days,exam,evidence`, DPP conhecida com `date,origin,evidence` | H39 → cartão Origem da datação | Proveniência de fonte adotada e evidência, data civil, histórico preservado | `Por DUM`, `Por ultrassom/exame`, `DPP conhecida`, painel Resultado da datação e suíte PostgreSQL |
| `paSistolica`, `paDiastolica` | PA Sistólica/Diastólica em mmHg | Medidas → posições 1 e 2 do grid | Limites atuais, inteiros, PAS maior que PAD | `#pa-sistolica`, `#pa-diastolica` |
| `frequenciaCardiaca`, `frequenciaRespiratoria` | Frequência Cardíaca em bpm, Respiratória em irpm | Medidas → posições 3 e 4 | Inteiros, limites de entrada atuais | `#frequencia-cardiaca`, `#frequencia-respiratoria` |
| `temperatura`, `saturacaoO2` | Temperatura °C, Saturação O₂ % | Medidas → posições 5 e 6 | Temperatura com até um decimal, saturação fora da soma MEOWS | `#temperatura`, `#saturacao-o2` |
| `oxygenMode`, `oxygenFlow` | `unknown/air/supplemental`; fluxo em L/min | Complementares → dois campos vinculados no mini-bloco Oxigenação | Fluxo visível somente suplementar e >0 para concluir a medida | `#oxygen-mode`, `#oxygen-flow` |
| `debitoUrinario` | `normal/reduzido/ausente` e vazio | Complementares → mini-bloco Débito Urinário | Opcional, sem pontuação direta | `#debito-urinario` |
| `nivelConsciencia` | `alerta/confusa/sonolenta/inconsciente` e vazio | Complementares → metade direita de Achados rápidos | Mesmo enum, ausente mantém MEOWS incompleto | `#nivel-consciencia` |
| `proteinuria` | `nao_realizado/negativa/tracos/1+/2+/3+` e vazio | Qualitativa → metade esquerda de Achados rápidos | Seleção responsiva com o mesmo valor e limpeza | `Resultado qualitativo`, `#proteinuria` no select |
| `proteinuriaMethod` | `fita/outro` e vazio | Depois do qualitativo → depois do qualitativo | Limpa ao selecionar Não realizado ou vazio | `Modalidade do teste qualitativo` |
| `proteinuriaLab.value/unit/date/method` | Valor, unidade, data, método | Expansão → expansão no card Achados rápidos | Completo ou ausente, mesmo payload quantitativo | `Valor laboratorial`, `Unidade laboratorial`, `Data do exame`, `Método laboratorial` |
| `alturaUterina`, `bcf`, `pesoAtual` | Altura Uterina cm, BCF bpm e Peso Atual kg | Campos obstétricos → mesmo grupo, esquerda | Mantém limites de entrada e decimais existentes | `#altura-uterina`, `#bcf`, `#peso-atual` |
| `movimentacaoFetal`, `sangramentoVaginal` | `presente/reduzida/ausente`; `ausente/leve/moderado/intenso`, além de vazio | Campos obstétricos → mesma grade | Enums preservados | `#movimentacao-fetal`, `#sangramento-vaginal` |
| `edema`, `edemaLocations`, `edemaOtherLocation`, `edemaProvenance` | `nao_avaliado/ausente/1+/4+…4+/4+`, membros inferiores/mãos/face/generalizado/outro e descrição | Edema → cartão direito | Oculta/limpa locais sem grau, Outro condicional, proveniência no registro do atendimento | `#edema`, `Face`, `Outra localização do edema`, testes servidor/legado |
| `queixasPrincipais` | Queixa principal | Texto → linha completa do cartão clínico | Até 200 caracteres, mesmo payload | `#queixas-principais` |
| `soapNotes`, `observacoesProfissional` | S Subjetivo, O Objetivo, A Avaliação, P Plano e legado | Registro clínico → grade SOAP 2×2 e disclosure histórico | Notas com rascunho protegido, autor e carimbo da sessão, legado preservado | `S — Subjetivo`, `O — Objetivo`, `A — Avaliação`, `P — Plano`, `Adicionar anotação` |
| `allergyStatus`, `allergies[].agent/reaction/notes` | `desconhecido/sim/nao`, agente, reação, observações | Editor aberto → grupo Alergias no card clínico | Seleção e múltiplas entradas. Omissão preserva informações anteriores | `Investigação de alergias`, `Substância ou agente 1`, `Reação relatada 1`, `Observações 1` |
| `medications[].name/dose/frequency/route` | Medicamento, dose, frequência, via | Editor aberto → grupo Medicações em uso | Múltiplas entradas e alterações explícitas. Omissão preserva anteriores | `Medicamento 1`, `Dose 1`, `Frequência 1`, `Via 1` |
| `comorbidityStatus`, `conditions[]` | `desconhecido/sim/nao`, condição relatada | Editor aberto → grupo Comorbidades | Enums, múltiplas condições e preservação anterior | `Informação sobre comorbidades`, `Condição relatada 1` |
| `pregnancies`, `deliveries`, `cesareans`, `pregnancyLosses` | Gestações anteriores, Partos, Cesáreas, Perdas gestacionais | Etapa 4 → disclosure Antecedentes obstétricos na mesma etapa | Coerência de contagens e persistência. Etapa 2 mostra somente leitura | `#pregnancies`, `#deliveries`, `#cesareans`, `#pregnancyLosses` |
| `referral`, `outcome`, `referralChoice`, `referralDetails`, `outcomeChoice`, `outcomeDetails` | Conduta e desfecho, observações e legado | Resultado → Resultado | Mesmos controles e revisão/fechamento, Outro exige descrição | `Conduta e encaminhamento`, `Desfecho da consulta` |

Os resultados executados com ambiente e rastreabilidade estão no [checklist](CHECKLIST-RESULTADOS.md). A regra de origem do autor, o algoritmo MEOWS e as bordas do laboratório têm verificações independentes do layout.
