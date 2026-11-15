# Evolução clínica oficial — plano separado, NÃO EXECUTADO

Esta candidata entrega UX sintética e consulta documental privada. Não promove DemoProvider,
manifestos locais ou credenciais PAP-ID-DEMO ao sistema operacional.

1. Definir governança/competência e base de acesso: PAP_ADMIN não recebe prontuários por ser
   administrador. Separar identidade global, Patient/Pregnancy/Encounter e escopo município/UBS.
2. Projetar PAP-ID real: token opaco aleatório, hash em repouso, validade, revogação, rotação,
   minimização no lookup e estados auditáveis. QR/CPF/RG não são fatores suficientes para
   conceder acesso clínico. Credenciais de teste devem ser rejeitadas pelo contrato operacional.
3. Projetar PAP-Link/compartilhamento institucional e revisão documental autorizada; decidir
   propósito/base de acesso com responsável habilitado. Estado found não libera resumo clínico.
4. Preservar autenticação/MFA/IAM/CSRF e autorização por paciente/UBS em cada leitura/escrita;
   revogação ou mudança de contexto invalida a próxima operação, inclusive concorrente.
5. Persistência/idempotência e auditoria: usar serviços transacionais existentes, evitar
   atendimento duplicado, coordenar validação/escrita contra conclusão e registrar proveniência
   autor/data/motivo/antes/depois no servidor. Não confiar em valores before/after do cliente.
6. Protocolos: catálogo/versionamento imutável, direitos de uso, curadoria clínica, permissões
   próprias e distribuição por unidade. Não derivar poderes das permissões LMS. Stream/download
   reautorizam sessão, escopo, publicação e versão; sem links públicos duradouros a objetos.
7. Ensaiar migrations somente em banco descartável/clone autorizado, backup/restore, dados
   legados, runtime mínimo, dois tenants, anti-IDOR, concorrência, MFA revogado e auditoria.
   Só propor upgrade do laboratório persistente após revisão e aprovação específicas.
8. Executar CI completo no SHA do candidato operacional, testes de segurança e jornadas reais
   sintéticas por papel antes de homologação assistencial. Aprovação clínica qualificada é gate.

MEOWS assistencial permanece desativado/DRAFT_UNVALIDATED conforme política existente.
O motor demonstrativo e as condutas dos PDFs não são habilitados como decisão/prescrição.
Nenhuma API, migration, concessão IAM, conta ou vínculo real foi implementado nesta fase.
