# PAP-MEOWS v1.0 — motor demonstrativo

Estado: DEMONSTRATIVE_NOT_CLINICALLY_VALIDATED. Matriz fornecida pela missão, sem validação assistencial independente.

Resultado demonstrativo. Protocolo ainda não homologado para uso assistencial nesta plataforma.

| Parâmetro | Faixas → pontos |
| --- | --- |
| PAS | <80→3;80–89→2;90–139→0;140–149→1;150–159→2;≥160→3 |
| PAD | ≤39→3;40–49→2;50–89→0;90–99→1;100–109→2;≥110→3 |
| FC | <60→3;60–100→0;101–110→1;111–149→2;≥150→3 |
| FR | <12→3;12–17→0;18–24→1;25–29→2;≥30→3 |
| Temperatura | ≤35,0→3;35,1–37,4→0;37,5–38,9→1;≥39,0→3 |
| Oxigênio | ar ambiente explícito→0;suplementar <5 L/min→2;≥5→3 |
| Consciência | alerta→0;confusa/sonolenta/inconsciente→3 |

Temperatura aceita no máximo uma casa decimal, sem arredondamento. Pressões e frequências exigem inteiros. SpO₂ não pontua. Ausência de fluxo suplementar não equivale a zero. Dados faltantes produzem INCOMPLETO e score null; entrada inválida não produz total definitivo. Parâmetro com três pontos mantém critical=true mesmo em resultado incompleto.

Precedência: incompleto; inválido; total≥6 ALTO_RISCO_PELO_SCORE; qualquer parâmetro3 ALERTA_CRITICO;total4–5 MODERADO;total1–3 ALERTA_REAVALIACAO;total0 SEM_ALERTA_PELO_SCORE. Não produz prescrição, encaminhamento ou alerta operacional.

Limites físicos de entrada foram preservados. O motor puro não acessa banco, rede, IAM ou dados operacionais. Fixtures históricas não recebem sinais vitais inventados.

Integração concluída na feature: `src/lib/meows.ts` apenas reexporta o motor existente; não duplica o algoritmo. Registro continua com cinco etapas, oxigenação explícita e fluxo condicional. O domínio do formulário exige fluxo suplementar >0; zero é rejeitado antes do salvamento. O motor puro mantém a matriz numérica consolidada (incluindo seu caso zero); a restrição de domínio pertence ao formulário/serviço demonstrativo e é testada separadamente.

Cada atendimento novo tem `assessmentSource=PAP_MEOWS_DEMO`, snapshot `assessment` (versão, validação, componentes/valores/pontos, crítico, faltantes, erros, total/classificação), mais cópia independente de `registration`. `score` e `classificacao` vêm do snapshot na criação. Prontuário, histórico, detalhes e Dashboard usam o mesmo atendimento/ID. Não há cálculo retrospectivo de fixtures, banco ou API clínica.

Fixtures anteriores recebem `ILLUSTRATIVE_FIXTURE`, sem assessment ou sinais inventados. Suas classificações são rotuladas como ilustrativas. O gráfico de evolução MEOWS inclui somente cálculos demonstrativos completos, domínio0–21; a tabela conserva todos os registros e a origem é identificada. O eixo sistólico acompanha os valores realmente informados sem fabricar medições.

| Grupo de apresentação | Classificações |
| --- | --- |
| Sem alerta / ilustrativo | SEM_ALERTA_PELO_SCORE e BAIXO_RISCO ilustrativo |
| Atenção demonstrativa | ALERTA_REAVALIACAO, MODERADO e ATENCAO ilustrativa |
| Alertas demonstrativos | ALERTA_CRITICO, ALTO_RISCO_PELO_SCORE e URGENCIA ilustrativa |
| Não avaliado (fora das barras/denominador) | INCOMPLETO, INVALIDO, NAO_AVALIADO |

Este agrupamento serve apenas a filtros/indicadores demonstrativos, não estabelece equivalência clínica. O código detalhado permanece fonte de verdade e é mostrado nos resultados. A agregação usa a última avaliação de cada paciente; totalização de atendimentos não depende de score. Não há conduta, diagnóstico ou encaminhamento automático.

A precedência do motor continua INCOMPLETO antes de INVALIDO; quando há faltantes e erros simultâneos, ambos são exibidos por AssessmentDetails e não existe total definitivo. O wizard bloqueia progressão/salvamento de entradas inválidas; permite salvar incompletos com total null. Nenhum ausente é convertido em zero.

Evidências finais: 76 testes Node PASS, incluindo55 do motor inalterado e6 novos de integração. Jornadas completas/críticas/incompletas em navegador PASS. Relatório, capturas e hashes em PREMIUM-2-RELATORIO-FINAL.md e PREMIUM-2-FINAL-EVIDENCE.json. Validação assistencial continua pendente e explicitamente fora do escopo.
