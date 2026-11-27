# Hospital Beta 1 — documentação e assinaturas propostas
**Minutas para revisão jurídica e governança clínica do hospital; não equivalem a conformidade automática nem substituem parecer jurídico.** A base legal do tratamento de dados de saúde precisa ser avaliada pelo hospital (controlador) e PAP Saúde (possível operador) conforme o arranjo concreto. Consentimento do paciente **não é automaticamente a única base legal** e não deve ser imposto sem análise do contexto assistencial e políticas locais.

## A. Documento de implantação piloto / termo de cooperação (PAP Saúde + hospital)
**Partes:** [Razão social/CNPJ do hospital], [responsável legal], [PAP Saúde/empresa/CNPJ], [responsável técnico], [DPO/encarregado ou canal].
**Objeto e escopo:** implantação Beta 1 em [setor] para [N profissionais], período [início/fim], infraestrutura [VPS/ambiente], versão SHA/digest [ ], dados [fictícios ou reais autorizados], funções liberadas [ ]. Especificar que Vitrine permanece isolada e é somente demonstração. Não permitir uso assistencial de módulos não aprovados.
**Critérios de aceite:** autenticação individual+MFA, restrição por unidade e paciente, registros auditáveis, integridade, disponibilidade, suporte, backup/restore, incidentes, treinamento, relatório de riscos e acesso de emergência conforme política. Sistema hospitalar oficial e registro assistencial de contingência permanecem disponíveis.
**Responsabilidades:** hospital: autorização institucional, instrução ao profissional, avaliação de uso médico, cadastramento dos profissionais e validação clínica; PAP: segurança da aplicação, suporte, atualizações controladas e correção de incidentes nos limites contratuais; responsabilidades conjuntas definidas formalmente.
**Terminação:** desativação de acessos, exportação/portabilidade autorizada, retenção legal e destinação dos dados/backup acordadas.
**Assinaturas:** representante legal do hospital [ ]; representante PAP Saúde [ ]; responsável assistencial [ ]; TI/SI [ ]; data [ ].

## B. Acordo de tratamento de dados / DPA + anexos LGPD
Definir quem decide finalidade e meios (controlador), quem executa instruções (operador), suboperadores (hosting, email, backup), localidade/transferência internacional se houver, categorias de dados (identificação, gestação, prontuário), finalidade, minimização, controles de acesso, MFA, criptografia e retenção, atendimento aos titulares, exclusão e devolução, auditoria, comunicação entre partes e regras de incidentes. Anexar inventário de operações, fluxo de dados, funções e terceiros. 
**RIPD:** avaliar/documentar formalmente a necessidade de Relatório de Impacto à Proteção de Dados (recomendável para piloto com dados sensíveis, conforme risco) e aprovar mitigação; ver orientação da ANPD.
**Base normativa:** LGPD Lei 13.709/2018, principalmente arts. 5º e 11, e guias ANPD. Incidente com risco/dano relevante: controlador avalia comunicação à ANPD e titulares nos termos da Res. ANPD 15/2024 (prazo geral 3 dias úteis, exceções legais); contrato prevê aviso do operador ao hospital em janela menor.
**Assinaturas:** representantes legais e responsáveis por privacidade de ambos.

## C. Termo de responsabilidade e credenciamento profissional (hospital + cada profissional)
Profissional [nome, conselho profissional, registro, unidade], perfil/autorização [ ], data de ativação [ ], compromisso de confidencialidade, uso de conta individual/MFA, não compartilhamento, uso dos recursos somente nas atribuições autorizadas, registro de autoria, reporte de incidentes e comportamento em contingência. Hospital aprova matriz por categoria e vínculo institucional; PAP Admin concede somente perfis aprovados.
Assinam profissional, gestor de unidade/hospital (ou registro de aceite eletrônico auditável).

## D. Termo de validação clínica dos módulos e protocolos (hospital/RT + PAP)
Matriz para cada função: Registro (GO/NO-GO), consulta longitudinal (GO/NO-GO), SOAP/autoria/retificação/assinatura (GO/NO-GO), Agenda, PAP-Gest, protocolos/documentos, MEOWS clínico, IA e demais. Identificar documento/protocolo versão, parecer de responsável clínico, critérios, limitações e equipe de monitoramento. **MEOWS e fluxogramas com ambiguidades ou validação pendente ficam BLOQUEADOS para decisão assistencial**. Investigar enquadramento SaMD pela Anvisa RDC 657/2022 de acordo com uso pretendido; não inferir isenção a partir do nome "Beta".
Assinam responsável técnico assistencial, qualidade/segurança do paciente, PAP e representante hospitalar competente.

## E. Termo de aceite técnico, backup e contingência (PAP + TI hospital)
Registrar SHA/digest, banco/nome de projeto, segregação, DNS/TLS, verificação de backups cifrados/restores, RPO/RTO e responsável, rotação de credenciais, logs/auditoria, monitoramento e comunicação de incidentes. Aprovação do plano de continuidade e sistema oficial alternativo em caso de falha. Não documentar senha, segredo, IP de admin ou dump no termo.
Assinam TI/SI hospital, PAP técnica, gestor responsável.

## F. Aviso de privacidade e transparência aos pacientes
O hospital define transparência, base legal, dados tratados, comunicação/canais, direitos, prazos e procedimentos. Se consentimento específico for juridicamente necessário para alguma finalidade adicional, fornecer instrumento separado; **não confundir termo hospital↔PAP com consentimento de pacientes**.

## GO / NO-GO hospital
[ ] Assinaturas e escopo aprovados  
[ ] DPA, inventário de dados e classificação de risco revisados  
[ ] Profissionais reais credenciados pelo hospital; MFA ativo  
[ ] Backend clínico funcional, persistência/autoria e auditoria verificadas  
[ ] Backups off-host criptografados com restore ensaiado  
[ ] Vitrine/fixtures isolados; papadmin separado  
[ ] MEOWS/fluxos aprovados clinicamente OU bloqueados sem possibilidade de decisão assistencial  
[ ] Incidente e contingência com responsáveis/testes  
[ ] Registro de aceite técnico e clínico assinado  
Sem todos os itens aplicáveis, usar apenas dados fictícios no piloto.
