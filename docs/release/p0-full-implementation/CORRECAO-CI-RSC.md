# Diagnóstico cirúrgico de metadados RSC

Base f7538e0, CI40726030005. Operador confirmou falha exclusiva no objeto de rota dinâmica de assertMetadataPrefetch, linha54. Inspeção restrita ao teste e /vitrine/[section]: guard requireCommercialPageSession executado antes de demoContent; sem alteração de aplicação.

Adicionada projeção sanitizada antes da asserção: somente chaves conhecidas ou marcador inesperado, comparações booleanas de n/t/k, tipo/comprimento/tipos de elementos de s. Sem valores desconhecidos, corpo de resposta, URLs privadas, identidade ou headers. Registra uma ocorrência por forma no console e GITHUB_STEP_SUMMARY, preservando evidência mesmo após afterEach sanitizar erros.

Contrato ainda exige s:null; não foi relaxado sem evidência remota. Execução local dirigida HTML/RSC/API/revogação PASS1; forma recebida localmente: chaves k/n/s/t, n/t/k corretos, suffixKind null. Não prova a forma recebida no CI. Segurança da projeção PASS com sentinelas em valores/nomes desconhecidos e array aninhado; nenhum vazamento em console/resumo. TypeScript/lint/diff PASS. Logs e hashes em evidence/validation.json.

Publicação de diagnóstico é necessária para obter a forma real do protocolo no CI, cujo log integral não está acessível via API neste ambiente. Não se trata de GO nem correção final da asserção. Próximo: ler resumo público do mesmo SHA, comparar estrutura real, adaptar somente contrato legítimo e testar dados maliciosos/estrutura excedente. Não alterar guards, dados ou permissões para fazer passar. Nenhuma auditoria geral, instalação ou Docker build local. Laboratórios/VPS/contas/MFA preservados.
