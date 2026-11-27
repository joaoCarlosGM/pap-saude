# Inventário do Registro antes da alteração

Base `cfc1a534ca83825eff77f444b4428c83465705bf`. Campos fora das etapas 2–4 preservam o binding e a navegação atuais. A coluna de teste contém o plano inicial, com os resultados executados no checklist.

| Campo ou grupo | Atual | Contrato aprovado e implementação planejada | Verificação |
|---|---|---|---|
| `cpf`, `nomeCompleto`, `dataNascimento` | Identificação e vínculo existente | Manter etapa 1, estratégias CPF/manual/QR e identidade persistida | Cadastro manual e QR nas regressões |
| `primeiroAtendimento`, `dumUnknown`, `dum` | Sim/Não anulável, DUM ou desconhecida | Grupo abaixo do cartão, formulário DUM condicional, data civil | Alternar fonte e retornar sem perder rascunho |
| Datação complementar | Somente DUM | Ultrassom com data, idade na data, tipo e evidência. DPP conhecida com origem/evidência. Mostrar IG, DPP, trimestre e data civil | Testes de cálculo, validação, histórico e persistência |
| `paSistolica`, `paDiastolica`, `frequenciaCardiaca`, `frequenciaRespiratoria`, `temperatura`, `saturacaoO2` | Inputs individuais e unidades | Seis cartões na mesma ordem, unidades e dados preservados | Preencher e verificar zero/solicitação de parâmetros, sem adicionar EVA ou glicemia |
| `oxygenMode`, `oxygenFlow`, `nivelConsciencia`, `debitoUrinario` | O₂ condicional e seletores dedicados | Avaliação complementar, preservar enum e entrada de fluxo | O₂ suplementar com e sem fluxo, retornar ao passo |
| `proteinuria`, `proteinuriaMethod`, `proteinuriaLab.{value,unit,date,method}` | Qualitativa, modalidade condicional e painel quantitativo | Mesmo componente no cartão complementar | Não realizado, método de fita e validação quantitativa |
| `alturaUterina`, `bcf`, `movimentacaoFetal`, `sangramentoVaginal`, `pesoAtual` | Grade obstétrica existente | Cartão Avaliação obstétrica com as mesmas validações e unidades | Preenchimento e resumo |
| `edema`, `edemaLocations`, `edemaOtherLocation`, `edemaProvenance` | Graduação condicional e proveniência histórica | Cartão Edema reutiliza os campos e mantém legado | Alternar grau e verificar limpeza acompanhada de preservação histórica |
| `queixasPrincipais`, `observacoesProfissional`, `soapNotes` | Queixa, campos S/O/A/P, blocos históricos | Cartão Registro clínico, grade 2×2, identidade da sessão | Nota não salva, anexação, histórico e autor via PostgreSQL |
| `allergyStatus`, `allergies[].{agent,reaction,notes}` | Seletor e lista condicional | Coluna Alergias, adicionar e remover | Manter histórico com nova consulta vazia |
| `medications[].{name,dose,frequency,route}` | Lista editável | Coluna Medicações, administrar a lista | Dados preservados ao voltar e salvar |
| `comorbidityStatus`, `conditions[]` | Seletor e lista condicional | Coluna Comorbidades | Opções e lista preservadas |
| `pregnancies`, `deliveries`, `cesareans`, `pregnancyLosses` | Antecedentes da etapa 4 | Disclosure Antecedentes obstétricos | Contagens coerentes e resumo final |
| `referral`, `outcome`, `referralChoice`, `referralDetails`, `outcomeChoice`, `outcomeDetails` | Resultado/legado | Manter etapa 5 e acrescentar somente leitura da datação adotada | Fluxo de desfecho e histórico |

Não há novos campos para glicemia, EVA, unidade, alto risco ou gêmeos. O algoritmo MEOWS e as opções dos campos preexistentes são a referência para a apresentação.
