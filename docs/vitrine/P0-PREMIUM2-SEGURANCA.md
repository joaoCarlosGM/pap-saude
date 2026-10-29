# Segurança — Vitrine Premium2 integrada ao P0

Base P0:7526cb95454017ede8a77113f91ce3b43e2dc7df; início:a45110832513014537b22c9415d2ebfe042220bf. Fonte visual:64fc7a9317159436c36c801051ed2065d29547af. Código integrado:0a007755294fec581c5e9ea0cfbbdfb49a6810fa. Resultados detalhados/hashes: P0-PREMIUM2-EVIDENCIAS.json.

## Fronteira de confiança

O layout server e todas as folhas de `/vitrine` chamam o guard comercial original. Nenhuma modificação em `src/server/*`, APIs, autenticação, MFA, IAM, Prisma, páginas clínicas, shells operacionais, fontes, Next config, CI/CD, Dockerfiles ou scripts locais existentes. O diff contra a base P0 é conferido por teste automatizado; não houve merge/cherry-pick da aplicação demonstrativa.

O host client e todos os seus componentes/tipos/helpers ficam em `src/features/vitrine-premium`. O grafo não importa serviços operacionais, Prisma, client clínico ou outro namespace `@/`; não há fetch ou URL `/api/` nesse grafo. Guards P0 continuam lendo metadados de sessão/usuário/IAM/MFA: não se afirma que autorização funciona sem PostgreSQL. A apresentação/registro/calculadora não lê nem escreve pacientes, instituições ou prontuários.

## Provas executadas no integrado

| Contrato | Evidência real | Resultado |
| --- | --- | --- |
| Não conceder Vitrine implicitamente a Admin/Manager | HTML direto nas12 rotas testadas, sessão real com MFA, sem COMMERCIAL | PASS: redirect/login |
| MFA obrigatório mesmo com COMMERCIAL | Sessão primária do mesmo usuário com fator ativo | PASS: redirect/comercial, preserva jornada original de MFA |
| Anônimo não monta host | Todas12 rotas incluindo paciente sintético | PASS: redirect/login |
| Revogação respeitada na próxima requisição | Remoção do grant no DB descartável; novas requisições HTML/RSC | PASS; sem dados de fixture no RSC negado |
| Nenhuma autorização por query/tenant ou ID real | query em Registro/paciente e IDs desconhecidos/real/predizível ausente | PASS404; UUID real não é consultado |
| IDs novos só encontram estado próprio | Novo demo-patient-1 por navegação client preserva snapshot; URL direta ausente999999 devolve404 | PASS |
| Nenhum escape clínico em links | Auditoria estática de literais+imports e anchors reais em60 visitas; cartão/linha/recentes por teclado | PASS: `/vitrine/*`, exceção deliberada `/comercial` |
| COMMERCIAL não adquire acesso clínico | HTTP API clínica403, páginas reais redirecionam; legadoE8 e IAM/B27 | PASS |
| Não ler tabelas clínicas/instituições | Next3500 usando papel `premium_readonly`: SELECT/INSERT/UPDATE/DELETE negados em organizations/patients/encounters/vital_signs/obstetric_data | PASS: jornada completa funcionou sob essas restrições |
| Sem mutações do demonstrador | Fingerprint por contagem antes/depois: pacientes, atendimentos, vitais, obstétricos, avaliações, organizações, memberships, grants; zero chamadas `/api/` | PASS: salvar/restaurar só memória |
| Não importar mocks para operação | Diff byte a byte dos diretórios protegidos e engine operacional | PASS |
| Fluxos de auth/MFA não enfraquecidos | 18crypto+186integração, serviços/guards originais intactos | PASS |

IDs seed são reconhecidos pela fixture Premium; família demo-patient-N é estritamente sintética e existência é conferida pelo provider. `notFound()` no cliente também é executado na renderização HTML inicial; a resposta direta para ID sintético ausente foi testada como404. Uma ficha criada em memória não sobrevive a reload; não existe consulta de fallback ao banco.

`isPremiumSection` é uma whitelist própria para as10 seções de UI, incluindo configurações e ajuda. `isDemoSection`/contrato da API legada permanecem inalterados e não são ampliados por esse catálogo. Não há contexto de tenant selecionável na camada Premium. Município/UF/UBS são rótulos sintéticos editáveis, nunca IDs institucionais reais. A identidade da sessão não alimenta o perfil fictício; o e-mail do ator não aparece no corpo da página.

## MEOWS e persistência

O engine demo tem o mesmo SHA256 da origem aprovada e seus55 testes foram executados neste P0, juntamente com os6 de integração e demais testes adaptados. Protocolo/resultado/componentes/faltantes/crítico são snapshots ligados ao atendimento sintético. Total ausente é null e apresentado como—, não zero/baixo risco. O browser integrado verificou crítico3 com PAS160 e os demais componentes normais; outro caso verificou INCOMPLETO salvo/ficha/evolução e excluído do denominador de categorias no Dashboard. Fixtures antigas continuam ilustrativas, sem vitais fabricados ou mistura no gráfico computado.

`src/server/meows/*` segue byte idêntico à base: PAP_MEOWS_V1_REAVALIACAO,1.0-draft,DRAFT_UNVALIDATED,clinicallyValidated:false; nenhum alerta/classificação assistencial foi habilitado. Política/engine/fronteiras P0 tiveram22 testes e a integração MEOWS clínica8. A avaliação demonstrativa não produz tratamento, encaminhamento ou notificação operacional.

O estado sintético permanece no provider, dentro do layout protegido. O único item `pap.*` de sessionStorage na jornada é `pap.vitrine.premium.welcome.v2=seen`, flag de apresentação que não confere acesso nem substitui onboarding/MFA. Recarregar/restaurar descarta registros locais. Nenhum dado de paciente é persistido em local/sessionStorage ou enviado à API Vitrine legada/serviços externos por essa camada.

## Infraestrutura de teste e preservação

Containers únicos `pap-premium2-<uuid>`, labels `pap.disposable=premium2-integration`/owner aleatório, PostgreSQL em tmpfs e portas127.0.0.1. Nenhum recurso existente foi adotado. Migrations foram aplicadas apenas em bancos recém-criados nesses containers, sem modificar arquivos históricos. Limpeza exige CID+labels próprios. Todos os containers desta missão foram encerrados após as verificações; nenhum volume existente foi utilizado. Laboratórios3200/3300, VPS, produção, credenciais e MFA existentes não foram acessados/alterados.

Auth e MEOWS legados usam o helper de limpeza já existente somente em bancos descartáveis explicitamente permitidos. Isso não é prova de imutabilidade de auditoria nessas suítes: os triggers são temporariamente desabilitados exclusivamente para limpeza de fixtures. O runtime clínico protegido é separado e não usa essa exceção; seus38 casos aprovados mais1 de login/runtime restrito verificaram integridade, concorrência, proveniência e permissões. Nenhum guard/assert ou trigger de produção foi alterado.

O preview opcional cria somente uma conta COMMERCIAL de teste no banco novo, sem fator MFA previamente configurado, para inscrição real pelo navegador. Credenciais aleatórias ficam em arquivo local0600 dentro de diretório temporário privado; o seed verifica propriedade/CID/porta antes de gravar. Não se adicionou conta, senha ou chave ao produto, nem se reprovisionou PAP_ADMIN do operador.

## Limites e decisão

Build integrado executado, exit1: bloqueado na obtenção de Google Fonts com CONNECT403; fontes/TLS preservados. TypeScript passou; isso não substitui completar as etapas posteriores do build em rede legítima. Lint global0 erros/4 warnings herdados em testes não alterados; lint do porte0 erros/0 warnings. Nenhuma dependência/lockfile foi alterada; não se realizou nova auditoria de dependências nem se declarou ausência de vulnerabilidades por inferência.

Evidências públicas contêm só status/hashes e18 capturas sintéticas. Logs de debug com possíveis dados de fixtures/configuração, credenciais, cookies, URI/chaves MFA e artefatos brutos permanecem privados, fora do Git. Sem aprovação de produção, conformidade legal ou certificação WCAG. Homologação humana3500 e build em ambiente com fontes acessíveis continuam necessários. Nenhuma PR, merge ou deploy autorizado/executado.
