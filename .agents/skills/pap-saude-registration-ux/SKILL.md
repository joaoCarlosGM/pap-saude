---
name: pap-saude-registration-ux
description: Implement exactly the approved UI concepts for PAP Saúde Registration steps 2 Gestação, 3 Sinais Vitais and 4 Dados Obstétricos, preserving every live field, validation, MEOWS dependency, state and historical record. Never use mockup examples as clinical facts.
---

# PAP Saúde — Registro Premium sem perda de campos

**Leitura obrigatória:** `docs/release/beta1-immersive-ux-h38-h42/REGISTRO-ETAPAS-2-3-4.md`, `CONTRATO-VISUAL-APROVADO.md`, `src/features/vitrine-premium/types/registration.ts`, `components/registro/steps/{PregnancyStep,VitalSignsStep,ObstetricStep}.tsx`, `components/registro/{ClinicalHistory,RecordFields,SoapNotes,RegistrationWizard}.tsx`, `lib/demo/{validation,data,meows}.ts`, `lib/registration-record.ts`, testes de registro existentes.

## Design fechado, não reinventar
- Stepper superior de cinco etapas permanece; ícones, progressão e textos existentes; header de cada etapa com ícone rosa sobre quadrado suavemente arredondado; cards brancos com borda cinza fina; títulos navy/slate, ação primária rosa PAP.
- Etapa 2: **cartão hero de datação** com origem selecionável, formulário contextual, coluna de resultados IG/DPP/trimestre; cartões compactos contextuais SEM mudar localização dos antecedentes existentes da etapa 4. Pergunta `É o primeiro atendimento desta gestação?` permanece integralmente.
- Etapa 3: **medidas principais em grade 3×2**, linha complementar organizada, painel lateral de MEOWS; os campos ausentes do concept (oxigenação, fluxo O₂, consciência, débito urinário e laboratório de proteinúria) não podem desaparecer. Glicemia e EVA constam apenas na ilustração e NÃO serão criadas sem requisitos funcionais aprovados.
- Etapa 4: respeitar concept existente de Datação/Avaliação obstétrica/Edema/Registro clínico/Alergias, mas sem duplicar a **datação** da etapa 2; preservar SOAP completo e todos os antecedentes clínicos originais.
- Nunca misturar dados de exemplo da arte com dados salvos, especialmente datas e scores.

## Regras de domínio
- DUM é opcional quando desconhecida, mas fonte ultrassom precisa data do exame, IG medida na data e evidência/fonte; DPP conhecida exige origem e confirmação; projeção apenas com fonte escolhida e referência temporal explícita; sem `DEMO_DATE` fixa em cálculos dinâmicos.
- Idade gestacional atual = diferença entre datação adotada e data civil atual da unidade; histórica usa data da consulta. Nenhuma redatação automática de consulta encerrada.
- MEOWS em tempo real utiliza `calculateDemoMeows` / contrato de algoritmo atual sem alteração de limiares, arredondamentos ou classificações. Sem informação suficiente -> incompleto; sem inferir score zero; sem prometer homologação clínica.
- Teste de proteinúria qualitativo com opções atuais + método quando medido; laboratório quantitativo em painel expansível com valor/unidade/data/método. Não afirmar resultado negativo a partir de `nao_realizado`.
- Oxigênio: `unknown|air|supplemental` e somente quando supplemental exibir fluxo obrigatório para completar MEOWS; nível consciência mantém `alerta|confusa|sonolenta|inconsciente`.
- Etapa 4: edema ausente/não avaliado esconde e limpa localizações; SOAP mantém S/O/A/P e autoria vinda do contexto da sessão; sem selecionar outra profissão.
- Preservar alergias (status `sim|nao|desconhecido`, agente, reação, observações), medicamentos (nome/dose/frequência/via), comorbidades (status/condições), antecedentes (gestações/partos/cesáreas/perdas); preservar informações longitudinais ao salvar.

## Critério de aceite
Antes de escrever código, apresentar matriz dos campos de `RegistrationData` por etapa e confirmar visual x atual; após escrever, Playwright no wizard real em cenários vazio, incompleto, completo, 3 pacientes sintéticas, retorno entre etapas, refresh/restart se persiste, histórico, testes MEOWS e calendários. Falha funcional ou campo omitido = NO-GO; arte bonita isolada não é PASS.
