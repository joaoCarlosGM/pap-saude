# Contrato de revisão e proveniência
Revisão é PROPOSED_NOT_APPLIED: não altera silenciosamente dado clínico. before vem do servidor; before do cliente não é autoridade. after é proposta limitada, com hash opcional para conflito otimista.
Ledger privado guarda snapshots, proposta, autor, data, motivo e vínculo. AuditEvent administrativo recebe referência opaca, sem nomes/snapshots/motivo clínico.
Histórico legado é LEGACY_UNVERIFIED, sem inventar autoria ou estado aplicado. Medições novas registram estado anterior e posterior na mesma transação.
PASS: 13 adversariais (tenant, vínculo, sessão/papel, hashes, proposta concorrente, privacidade, rollback e UPDATE/DELETE/TRUNCATE negados), mais os cenários de medição/concorrência e runtime.
Evidências: .test-audit/p0-composition/provenance13.log, clinical-concurrency26.log e p0-runtime-harness.log.
Aplicação de uma proposta exige fluxo clínico legítimo adicional; MEOWS permanece DRAFT_UNVALIDATED, sem classificação/alerta automático validado.
