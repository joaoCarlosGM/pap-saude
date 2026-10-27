# P0 — Estado operacional e validação pendente do MEOWS

## Contrato mantido

O algoritmo continua `PAP_MEOWS_V1_REAVALIACAO`, versão `1.0-draft`, `DRAFT_UNVALIDATED`, `clinicallyValidated:false`. Nenhum limiar foi criado ou alterado nesta missão. Não há autorização para decisões, alertas ou orientação terapêutica automáticos.

A função pura `evaluateMeowsDraft` valida valores e calcula apenas componentes definidos na política existente. Quando faltam medidas exigidas, retorna `INCOMPLETE`; quando há medidas numéricas completas, retorna `POLICY_UNRESOLVED`. Nos dois casos, `totalScore` e `alertLevel` permanecem nulos. Valor inválido é rejeitado, nunca convertido em zero tranquilizador.

O motor considera regras provisórias para pressões, frequência cardíaca e frequência respiratória e uma matriz de temperatura já existente. Elas permanecem rascunho. SpO2 é coletada, mas não integra a fórmula vigente. Oxigenoterapia e consciência continuam decisões não resolvidas. O helper de soma de componentes é uma operação aritmética pura; sua existência não autoriza publicar um score clínico final.

Persistência guarda versão/status, componentes, campos ausentes e decisões não resolvidas, com score/alerta nulos. O fluxo de registro deve continuar apresentando “não validado” e ausência de conduta automática. Novos endpoints idempotentes não podem promover esse estado a validado.

## Testes executados nesta missão

Comando: `tsx --test tests/clinical/meows-policy.test.ts tests/clinical/meows-engine.test.ts tests/release/p0-meows-operational-state.test.ts`, com Node22.23.4. **20/20 PASS**, sem banco ou serviço externo. Log em evidence/meows-tests.log.

Os 16 testes existentes permanecem intactos. Quatro novos testes verificam que todas as bandas numéricas já definidas continuam sem classificação final, que valores de oxigênio/consciência não resolvem decisões pendentes, que ausência de medidas gera resultado incompleto e que valores inválidos são rejeitados. Os valores de fronteira são derivados do código existente: o teste não estabelece nova política médica.

## Limites e requisitos de validação qualificada

Antes de uso classificatório, um responsável clínico deve: identificar e aprovar a fonte/versionamento do protocolo; resolver as decisões P1_ALERT_THRESHOLD, P2_FINAL_NUMERIC_MATRIX, P3_OXYGEN_RULE, P4_CONSCIOUSNESS_RULE e P5_SPO2_ROLE; aprovar unidades, inclusividade de fronteiras e tratamento de dados ausentes/extremos; estabelecer referência de casos esperados, erro aceitável e revisão de divergências; validar retrospectivamente com dados autorizados e privacidade; aprovar interface, alertas, resposta operacional, supervisão humana e rastreabilidade das alterações.

Validação clínica humana, sensibilidade/especificidade, benefícios assistenciais, integração RNDS e aceite regulatório: **NOT RUN / dependências externas**. Não se declara eficácia ou conformidade legal. Corrigir integridade de persistência não valida clinicamente o algoritmo.

## Decisão

GO somente para manter o componente como rascunho informativo em testes sintéticos. **NO-GO para classificação, alertas e decisões clínicas automáticas.** O código de política e o algoritmo permanecem byte a byte iguais à base E; apenas documentação e testes foram acrescentados.
