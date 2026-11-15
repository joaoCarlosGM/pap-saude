# PAP-Protocols — manifesto dos PDFs originais

**Status:** arquivos originais verificados fora do GitHub em 15/11/2026. A publicação dos binários na branch deve ser confirmada separadamente. Este manifesto não garante presença dos arquivos no repositório.

| Protocolo | Caminho esperado na branch | Páginas digitais | SHA-256 verificado |
|---|---|---:|---|
| Síndromes hipertensivas na gestação | `docs/protocolos/documentos-originais/sindromes-hipertensivas-gestacao.pdf` | 25 | `63a0dc9b93bc3be45632bcf46649c92d7118884135ac2ff8a95aa565830804d1` |
| Prevenção e manejo da hemorragia pós-parto | `docs/protocolos/documentos-originais/hemorragia-pos-parto.pdf` | 34 | `f48c79881152eae50e25ebaf8d354f1219db7c8dd9d5c41b8cfb8ff2360337d2` |
| Protocolo de sepse em pacientes obstétricas | `docs/protocolos/documentos-originais/sepse-obstetrica.pdf` | 36 | `5d4e5756b397ade0adc829cca8336eec86db14e955c22a528fa533a9a75f093b` |

## Instruções ao Codex

1. **Gate de direitos:** antes de ler/redistribuir PDFs no app público ou Vitrine Comercial, registrar a autorização institucional e as condições de uso. Se indisponível, trabalhar em ambiente privado e não disponibilizar download público.
2. **Gate de integridade:** confirmar a existência dos três caminhos acima e executar `sha256sum` nos bytes. Qualquer divergência é BLOCKED. Nunca substituir um PDF por imagem, trecho inventado ou texto gerado por IA.
3. **Extração:** criar conteúdo estruturado para Visão geral, Fluxograma e Checklist com referência precisa a PDF, página digital e seção. Manter separadas página impressa e digital; em sepse há divergência de códigos na documentação, que exige revisão.
4. **Avaliação clínica:** todo conteúdo extraído e especialmente intervenções, medicamentos, doses, limiares, fluxos e decisões deve ser revisado por responsável habilitado antes de publicação assistencial. Material em elaboração deve ter status explícito, não habilitar decisão clínica.
5. **PDF:** leitor e download apenas após autorização de distribuição e escopo de acesso validado no servidor; Vitrine sintética não deve expor arquivos restritos. Nunca ativar CTA se PDF não puder ser entregue legitimamente.
6. **Escopo:** as etapas P1 (Vitrine), P2 (PDF e extração) e P3 (governança Admin/UBS) são distintas. A documentação PAP-ID não depende desta publicação. Não realizar deploy/migrations nem alterar `prod` ou `PROD`.

**Verificação pós-upload:** `git ls-tree -r --name-only origin/feature/beta1-protocols-priority-nav docs/protocolos/documentos-originais/` e comparar os três hashes.
