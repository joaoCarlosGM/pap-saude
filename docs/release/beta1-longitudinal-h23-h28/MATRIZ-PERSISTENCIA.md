# Persistência

| Camada | Fonte | Comportamento |
|---|---|---|
| Laboratório privado v3 | `review_chart_events` no PostgreSQL descartável | Versões somente por inclusão. Regra de unicidade por entidade e versão. Operação idempotente por UUID e digest. Referências verificadas dentro da transação |
| Documentos e PAP-ID | `review_documents`, auditoria e armazenamento de carteirinhas existentes | PDF permanece em Documentos. Vínculo registra o UUID da versão autorizada. PAP-ID segue o cadastro do laboratório |
| Evolução, Agenda e Timeline | Diário privado e auditoria existente de Documentos | Estado reconstruído a partir das versões. Compromissos da demonstração provenientes da Agenda H22 aparecem com origem navegador |
| Registros sem sujeito do laboratório | Estado em memória e armazenamento H22 para Agenda | A confirmação do Registro declara armazenamento na memória da aba. As fixtures permanecem ilustrativas |
| Perfil | Arquivo privado e volume registrados pelo launcher | `stop` e `start` reutilizam o mesmo volume. Uma nova instância de UI exige nova autorização |

A evolução do schema é isolada em `scripts/private-review/sql/003_longitudinal.sql`. O launcher checa o banco e o dono do perfil antes de aplicar a evolução aditiva. A aplicação não executa essa evolução durante requisições.

Consultas desprovidas de atualização de medicamentos, alergias, condições e datação preservam os valores anteriores. Relatos explícitos do Registro continuam disponíveis na consulta, e o estado longitudinal editado tem precedência na ficha. Nenhuma fixture foi retroativamente convertida em auditoria.
