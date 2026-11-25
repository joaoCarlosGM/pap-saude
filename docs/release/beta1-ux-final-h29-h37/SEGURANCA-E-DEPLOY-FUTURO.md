# Segurança e liberação futura

As novas notas SOAP usam a identidade sintética fixa da sessão de laboratório. Na escrita privada, o servidor define autor, categoria e data das novas notas em consulta. Nas notas posteriores, o diário registra carimbo de horário, autor e categoria. O pedido não define a identidade registrada. As notas históricas continuam com a autoria armazenada.

O servidor calcula o MEOWS demonstrativo com base nos valores registrados, guarda o resultado junto à consulta e preserva o histórico. A versão v1.0 e o contexto demonstrativo constam no resultado. A contagem de alertas lista somente parâmetros sinalizados na avaliação completa mais recente. Os compromissos da Agenda e os avisos gerais possuem seus próprios estados.

A emissão inicial da PAP-Gest usa o mesmo escopo de sessão, a mesma identidade e o armazenamento protegido existente. O cadastro é confirmado antes de iniciar a transação de emissão. A emissão inicial é serializada por paciente. Uma credencial ativa é reutilizada, e uma revogada ou expirada exige reemissão explícita. A recuperação de emissão preserva o cadastro já concluído. A credencial continua opaca e a imagem privada é cifrada. Documentos mantém as verificações de escopo, origem e PDF.

As alterações persistentes usam o laboratório sintético e seus eventos versionados. A futura operação assistencial depende de validação clínica do MEOWS e dos fluxogramas, direitos institucionais sobre os documentos, autoria pela identidade autenticada, revisão de RBAC, restauração do banco e aprovação do operador. O candidato encerra no push da branch.
