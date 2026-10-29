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

Evidência: tests/demo/meows.test.mjs, 55 testes executados PASS (fronteiras, precedência, precisão, incompletude, erro e SpO₂). Isto não comprova integração: nesta entrega parcial, registro, resultado, histórico, tendências e KPIs ainda usam o contrato anterior. H permanece pendente até implementar snapshots vinculados aos atendimentos e executar os testes da jornada.
