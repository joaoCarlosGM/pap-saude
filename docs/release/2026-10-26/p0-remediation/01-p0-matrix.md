# Matriz P0 — candidato composto
| P0 | Causa | Correção | Evidência local |
|---|---|---|---|
| MFA | Desafio aceitava tentativas inválidas sem teto persistente | Reserva atômica por desafio/identidade/origem; bloqueio e recuperação | 10 limites + 202 Auth/MFA; UI separada |
| Escrita após conclusão | Estado validado fora da escrita serializada | Lock/CAS no atendimento e escrita na mesma transação | 26 concorrência; quatro reproduções E preservadas na worktree de origem |
| Registro parcial/duplicado | Múltiplos POSTs sem identidade única | Operação transacional/idempotente e barreira de cancelamento | 68 Node + 4 E2E; upgrade 32→34 |
| Revisão/proveniência | before/after do cliente sem autoridade | Proposta não aplicada, snapshot do servidor e ledger individual | 13 proveniência; escrita real e ACL no gate runtime |
| Admin/F | Autoridade fora da transação e coorte inconsistente | Revalidação serializável e indicadores com fontes explícitas | 49 Node + 4 E2E; Beta/F04 complementares |
PASS local não substitui CI do futuro commit nem validação clínica/infraestrutura externa. Ver 10-controlled-composition.md.
