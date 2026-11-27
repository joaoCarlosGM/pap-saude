# Status de implantação — 27/11/2026 12h local do operador
**A implantação clínica não está pronta nem liberada por esta documentação.** Este commit apenas prepara um roteiro e uma missão técnica auditáveis. Não houve SSH/VPS live, backup real, migração, integração operacional, criação de usuários de hospital nem acordo assinado.

## Entregas existentes verificadas no repositório
- Branch de UI Premium candidata `feature/beta1-immersive-ux-h38-h43-rc` HEAD `bbb55aa54fadf749a0d721319b096203b309b2b6`.
- APIs clínicas REST autenticadas e registro transacional com MFA/IAM por unidade estão implementados; há módulos de domínio para pacientes, gestações, consultas, sinais vitais, obstetrícia, alergias e MEOWS.
- Vitrine atual usa `DemoProvider`/fixtures e APIs `/api/vitrine/`; trocar DB URL seria incorreto e perigoso.
- `deploy/admin-beta`: isola `pap-admin-beta`, `pap_admin_beta`, Nginx vhost `admin-beta.papsaude.com.br`, flag admin-only, runtime 127.0.0.1:3101; não hospeda automaticamente todas as rotas clínicas.
- Papel `PROFESSIONAL` tem permissões clínicas por unidade, porém categoria profissional/granularidade de ato precisa auditoria.
- H42 MEOWS/vias clínicas não homologados para decisões; imagem original do Registro pixel-diff não executada; aparelhos físicos/WSL pendentes.

## Horas úteis: cronograma por GATE, não promessa de entrega
**Hoje 27/11 — apresentação:** executar H44 comercial e demonstrar somente dados sintéticos. Iniciar H45 Fase A/B em branch isolada. Preparar documentos e checklist com hospital. Inventário read-only VPS, sem mudança de produção. 
**Até segunda 30/11 — instalação-piloto:** somente se Gate A/B/C finalizados e laboratório novo com banco sintético, login/MFA, permissões por unidade, backup/restauração, testes e aprovação formal. Se prontuário/autoria/scope clínicos não confirmados, manter Beta 1 em ambiente de treinamento com dados fictícios e não usar como registro assistencial oficial.
**Dados reais:** habilitar somente mediante autorização específica do hospital, base LGPD, contrato, profissional/RT e política assistencial, com suporte e rollback aprovados. Piloto com dados reais não é consequência automática de release técnico.

## Decisão arquitetural
- **Compartilhar UI** (uma única base de componentes) e implantar **dois modos separados por build, permissões, storage e contexto**: Vitrine sintética e clínico autenticado. Não duplicar páginas, mas garantir zero dependência runtime entre dados.
- Backend já existe, mas exige **adaptadores e mapeamento campo a campo**; não simplificar como apenas apontar Postgres a um novo DB.
- Banco hospitalar isolado em projeto próprio e roles runtime/migrator; usuário/tenant ligado a instituição por IAM do PAP Admin; sem autoelevação de PAP Admin a profissional.
- Recursos sem persistência real auditada devem permanecer bloqueados no clínico; a Vitrine pode continuar apresentando-os com dados fictícios.

## Fontes oficiais consultadas (não inferir aprovação)
LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
ANPD RIPD: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd
ANPD incidentes: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
Anvisa RDC 657/2022: https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&cod_menu=1696&cod_modulo=134&numeroAto=00000657&orgao=RDC%2FDC%2FANVISA%2FMS&pesquisa=true&seqAto=000&tipo=RDC&valorAno=2022
