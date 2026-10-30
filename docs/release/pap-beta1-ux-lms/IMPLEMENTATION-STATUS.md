# PAP Saúde Beta 1 — execução por slices

Base: c7b1d7558b26ec85b09d4c9025c75bdadd79bdc7, branch feature/p0-premium-unified-rc.
Baseline funcional: d247020, CI40962511599 SUCCESS. Pacote completo lido:00/PROMPT,oito documentos,manifesto e scripts. SHA256SUMS original diverge somente em00/PROMPT por whitespace final; os anexos conferem semanticamente. Não alterar o pacote recebido.

| Slice | Dependências e aceite | Estado / evidência |
|---|---|---|
| A | Shell/sidebar/hero abstrato/ajuda; preservar identidade e dados; responsivo/teclado | PASS dirigido:4 Node,5 invariantes,1 browser (7 larguras/2 temas/teclado/WCAG);10 capturas |
| B | Cards/ficha/atendimentos/registro com dados autorizados; KPIs byte-idênticos | PASS dirigido:2 Node +1 browser (card/ficha/teclado/tenant); APIs e registro preservados |
| C | Admin teal; rede→município→UBS→equipe; grants anteriores intactos | PASS dirigido:2 Node +1 browser Admin/Manager,7 larguras/2 temas/AA;4 capturas |
| D | Domínio LMS aditivo, IAM dedicado, editor seguro, versões imutáveis/release | PASS dirigido: autoria/publicação/owner/CAS, inclusão restrita; CI PENDING |
| E | Unidade/município: distribuição/ancestry, membros ativos, idempotência e inbox | PASS dirigido:12 backend, jornadas reais e agregado mínimo; CI PENDING |
| F | Player, checkpoints/avaliação no servidor, retomada/badge/progresso | PASS dirigido: perda de resposta/F5/nota server-side/HTML-RSC/AA; CI PENDING |
| G | Restore/migrations/continuidade de credenciais em fixture, CI integral, GO/NO-GO | PASS local upgrade35→36/replay/drift/restore/restart/ACL/build; CI PENDING; operador NOT RUN |

## Invariantes

Nenhum acesso ao laboratório3600/PG15436, .local, senhas/MFA/sessões/volume do operador. Não executar scripts preflight/backup contra o laboratório: apenas revisar e fornecer comandos opt-in. Testes em bancos descartáveis próprios identificados, nunca copiar dados reais. Não executar seed local. Não alterar dashboard queries/KPIs, clínica/MEOWS assistencial, CAPTCHA/MFA/session store. Conteúdo LMS declarativo, sem HTML/JS arbitrário. Certificação não homologada: sem emissão de certificado. Suporte sem serviço: CTA indisponível honesto, sem envio fictício.

Atualização do laboratório: somente operador, após backup/restore válido e autorização explícita para migrations aditivas; preservar .local e origem127.0.0.1:3600. Nenhum PR, merge de integração, deploy/VPS/prod.

## Checkpoint atual

A/B/C publicados:38bb6bf,d3a24da,058f8b1. D/E/F implementados: LMS real, editor/versionamento, inclusão municipal restrita, distribuição municipal/unidade, aprendizado/avaliação persistente e Vitrine sintética compartilhando somente apresentação. Gate G local: build real, TypeScript/lint, testes dirigidos, upgrade/drift/restore/restart/ACL aprovados. CI integral do candidato ainda PENDING, nunca substituído pelo baseline histórico.

Consulte LMS-SECURITY-AND-CONTINUITY.md, SAFE-LOCAL-UPGRADE.md, VALIDATION.json e SOURCE-MANIFEST.json para comandos/resultados/inventário. Nenhuma ação no laboratório3600/15436. O ensaio do backup do operador e a homologação das sete contas continuam NOT RUN. Próximo: commits seletivos por responsabilidade, push somente da feature e CI integral exato; diagnosticar somente gate que falhar. Sem PR/merge/deploy/VPS.

SliceA: logs privados /tmp/pap-beta1-mission-20261030/slice-a-*.log; browser final /tmp/pap-beta1-tests-ANXAGw/browser.log. TypeScript/ESLint/diff PASS, zero warnings novos. Duas falhas de contraste2.21:1/3.7:1 corrigidas sem remover asserts. Harness inicial precisou corrigir import relativo/DB descartável/cwd de webServer.10 capturas sintéticas revisadas. Bootstrap/configuradores/MFA não modificados. Próximo:B paridade de cards/ficha, depoisC Admin eD domínioLMS. CI integral somente no candidato consolidado; pushes intermediários podem acionar o workflow existente, sem desativá-lo.

SliceB: dois testes de apresentação/idade PASS; jornada com paciente vinculada à UBS real descartável, navegação teclado/ficha/seções/negativa outra UBS PASS (/tmp/pap-beta1-tests-7F8iBa/browser.log). TypeScript/lint/diff PASS. Sem inferir IG/DPP/alergia quando API de lista não fornece; ficha reutiliza APIs autorizadas. Ajuste adicional do hero de layout para texto rotulado preserva H1 original único; teste SSR cobre unicidade sem remover o texto DOM. Registro/atendimentos existentes reutilizados; regressão integral ainda NOT RUN no novo candidato.

SliceC: commit anterior B d3a24da; Admin teal claro/escuro, busca de rede usando somente DTO mínimo autorizado; serviços e métricas institucionais intactos. PAP_MANAGER tem bancada própria sem métricas; destino exige acesso administrativo efetivo, não apenas nome de papel. Comercial apenas com role GLOBAL COMMERCIAL e grant.2 Node +1 browser PASS,7 larguras,WCAG light/dark,negação clínica;4 capturas sintéticas revisadas. Evidência /tmp/pap-beta1-tests-PrGtGz/browser.log e /tmp/pap-beta1-mission-20261030/slice-c-*.log. TypeScript/ESLint/diff PASS. Cursos/biblioteca serão acrescentados somente junto das APIs/grants do LMS no próximo slice; ainda NOT RUN.
