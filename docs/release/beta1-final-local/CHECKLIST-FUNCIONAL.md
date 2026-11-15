# Checklist funcional

Resultados de execução e comandos estão em RELATORIO/evidence/validation.json; testes físicos são independentes.

| Área | Estado automatizado | Aceite manual |
|---|---|---|
| Nova pessoa sintética, documento inválido controlado, consentimento e deduplicação/idempotência | PASS | Cadastrar outra pessoa sem reutilizar dados reais |
| Emissão/reemissão/revogação pela UI e CLI na mesma base | PASS | Comparar QR antigo/atual, selecionar e confirmar documento |
| Mais de um QR, deduplicação e seleção explícita antes CPF/RG | PASS | Duas carteirinhas impressas/telas diferentes |
| Webcam, pausa/retomada, permissão negada e tracks encerrados | PASS em stream sintético | NOT RUN câmera física/USB/traseira |
| Carteirinha em Documentos, histórico e recuperação após restart | PASS | Parar/retomar somente o perfil próprio e renovar consulta |
| Upload, PDF.js, download byte-exato, versão e arquivo | PASS | Usar PDF sintético, testar nova versão e arquivamento |
| Três originais privados, hash/páginas/download reais | PASS | Conferir fonte, permissões e conteúdo com responsável |
| Overview/Fluxograma/Checklist/Documento original, zoom/tela cheia | PASS | Revisão visual e documental humana pendente |
| Progresso significa “li”, não atendimento executado | PASS | Confirmar aviso e limpeza sem alteração clínica |
| PostgreSQL privado aditivo e persistência após reinício | PASS | Nunca executar create novamente para retomar |
| Origem HTTPS, pareamento, sessão temporária, expiração/revogação e rotas fechadas | PASS automatizado | NOT RUN LAN real/Windows/Android/iPhone |
| MEOWS clínico, contas/MFA e base operacional | Preservados por comparação de arquivos | Não habilitar/alterar nesta homologação |

**Não usar a fixture para cuidado clínico.** Ela não integra prontuários operacionais, CNES, contas ou IAM reais. Dados sintéticos persistidos são restritos à base review.
