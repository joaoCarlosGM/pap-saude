# Diagnóstico cirúrgico de metadados RSC

Base f7538e0, CI40726030005. Operador confirmou falha exclusiva no objeto de rota dinâmica de assertMetadataPrefetch, linha54. Inspeção restrita ao teste e /vitrine/[section]: guard requireCommercialPageSession executado antes de demoContent; sem alteração de aplicação.

Adicionada projeção sanitizada antes da asserção: somente chaves conhecidas ou marcador inesperado, comparações booleanas de n/t/k, tipo/comprimento/tipos de elementos de s. Sem valores desconhecidos, corpo de resposta, URLs privadas, identidade ou headers. Registra uma ocorrência por forma no console e GITHUB_STEP_SUMMARY, preservando evidência mesmo após afterEach sanitizar erros.

Contrato ainda exige s:null; não foi relaxado sem evidência remota. Execução local dirigida HTML/RSC/API/revogação PASS1; forma recebida localmente: chaves k/n/s/t, n/t/k corretos, suffixKind null. Não prova a forma recebida no CI. Segurança da projeção PASS com sentinelas em valores/nomes desconhecidos e array aninhado; nenhum vazamento em console/resumo. TypeScript/lint/diff PASS. Logs e hashes em evidence/validation.json.

Publicação de diagnóstico é necessária para obter a forma real do protocolo no CI, cujo log integral não está acessível via API neste ambiente. Não se trata de GO nem correção final da asserção. Próximo: ler resumo público do mesmo SHA, comparar estrutura real, adaptar somente contrato legítimo e testar dados maliciosos/estrutura excedente. Não alterar guards, dados ou permissões para fazer passar. Nenhuma auditoria geral, instalação ou Docker build local. Laboratórios/VPS/contas/MFA preservados.

## Causa comprovada e contrato final

A reprodução com Turbopack (bundler usado pelo CI), mesmos fontes/hash e mesma instalação privada do Next 16.4.2 recebeu objeto com chaves k/n/s/t, n=section, t=d, k igual à rota e **s=[] vazio**; o contrato anterior s:null falhou. Webpack recebeu **s:null**. Portanto era divergência de representação vazia do protocolo, não evidência de autorização concedida. Não alegar acesso ao corpo remoto original: essa prova foi obtida na reprodução controlada do mesmo código/bundler; o log oficial do operador localizou a mesma asserção.

O helper puro rsc-dynamic-metadata.ts exige exatamente quatro chaves e os valores exatos de nome/tipo/rota. Só aceita s:null ou array vazio sem propriedades extras. Rejeita arrays preenchidos, strings, objetos, rota diferente, chaves ausentes/extras e dados anexados. As demais assertions da árvore Flight, referências, redirecionamentos, ausência de canário, MFA, API clínica403 e POST após revogação403 permanecem. HTTP200 de prefetch contém apenas a árvore pública de navegação, sem componente renderizado/dados; não concede acesso operacional. A rota de aplicação continua executando guard antes de demoContent e não foi alterada.

Execuções: Turbopack antes da correção FAIL no contrato s:null, projeção segura comprovando array vazio; caso completo HTML/RSC/API/revogação depois da correção **PASS1/1 em Turbopack** e **PASS1/1 em webpack**. Helper de contrato **PASS2 testes**, cobrindo duas formas válidas e 18 variantes negativas. Segurança da projeção PASS; TypeScript/lint/diff PASS. Sem auditorias gerais, produção build, Docker build, npm install/ci ou Prisma generate.

Reprodução isolada em /tmp: 5MB de fontes copiados e dependências privadas existentes reutilizadas por hardlinks (mesmo filesystem), sem nova worktree ou instalação. Banco reutilizado somente no container descartável verificado pelo runner (ID/owner/loopback). Nenhum recurso do operador/VPS acessado. A falta de espaço em /workspace não exigiu remover worktrees/evidências; o harness está em /tmp com espaço suficiente.

O commit de diagnóstico 26c41c8 acionou run40730435867 e falhou mantendo a asserção antiga; resumo sanitizado foi produzido, mas a API e a leitura pública desse resumo exigiram acesso indisponível. Os logs/hashes locais e projeções sanitizadas estão em evidence/validation.json. Próximo: CI do commit final; não declarar GO antes dos gates e aceites restantes.
