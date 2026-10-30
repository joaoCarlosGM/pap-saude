# Beta 1 — candidato funcional para homologação

Branch exclusiva `feature/p0-premium-unified-rc`, base do pacote c7b1d755. A/B/C publicados em38bb6bf/d3a24da/058f8b1. Commits finais e CI exato serão registrados após versionamento; não declarar release aprovado com esse gate pendente.

A entrega reúne shell Premium, banners abstratos locais, perfis/vínculos reais autorizados, cards/ficha clínica, Administração teal, bancada delegada sem KPIs globais, inclusão municipal pendente, LMS PostgreSQL real, editor seguro, publicação/versões, distribuição/atribuição, notificações e player persistente. A Vitrine tem seis cursos fictícios e progresso em memória; reutiliza a apresentação, não os serviços operacionais. Os KPIs e serviços clínicos aprovados não foram modificados. MEOWS assistencial permanece desativado.

## Evidências dirigidas

| Verificação | Resultado | Evidência privada do executor |
|---|---|---|
| Unitários de apresentação, navegação, cursos, ordem e diagnóstico | PASS17 antes do novo guard; PASS final inclui guard adicional, ver VALIDATION.json | beta1-unit-final-receipt.log |
| Invariantes de isolamento/clínica/IAM anterior/migrations | PASS5 | mesmo log |
| RSC transport metadata, casos positivos e adversariais | PASS2 | mesmo log |
| Backend LMS/inclusão/MFA/CSRF/concor­rência/idempotência | PASS12,0 skipped | /tmp/pap-beta1-tests-yzI0bI/integration.log |
| Distribuição/ancestry/privacidade municipal/autoria estrangeira | PASS1 dirigido adicional | /tmp/pap-beta1-tests-WB0w2H/integration.log |
| Browser operacional/sintético | 9 casos com PASS dirigido, sem remoção de asserts; CI deverá executar o conjunto no SHA final | XJkcdD(6PASS/2FAIL),L1XH44(2fixes PASS),RNsIlz(ordem/busca PASS) |
| Upgrade35→36, grants instalados pela migration, hashes legados, replay/drift/backup/restore/restart | PASS | /tmp/pap-beta1-tests-na2xGZ |
| ACL/servidor usando runtime | PASS; não owner, sem DDL/migrations/reescrita de ledger ou operação | runtime-acl.json nos diretórios privados de browser/upgrade |
| Helper de ensaio do backup escolhido | PASS somente com dump sintético próprio; original não acessado | operator-copy-helper-final.log |
| TypeScript/lint/diff | PASS nas execuções registradas; repetir somente alterações posteriores afetadas | VALIDATION.json |
| Build Next real | PASS,44 páginas geradas | /tmp/pap-beta1-tests-No8YYS/production-build.log |
| CI integral/Auth/F03/F04/Beta/B-C-D-E/Docker/Trivy | PENDING no novo SHA | registrar execução remota |
| Contas/lab/backup do operador | NOT RUN, sem acesso | homologação manual obrigatória |
| VPS/produção | NOT RUN / NO-GO | fora do escopo autorizado |

As duas falhas visuais finais eram identificação acessível de UF e contrato desatualizado de H1 (o banner passou a ser região rotulada, preservando H1 Dashboard). Foram corrigidas e ambas passaram isoladamente. Uma falha anterior real de contraste LMS dark(1,1:1) foi corrigida e a matriz AA passou. O teste RSC passou após demonstrar o contrato Next de canonicalização/fallback404 sem dados protegidos; o guard não foi contornado.

Capturas novas em evidence/ incluem LMS real Unit/learner/autor e catálogo/player sintéticos, desktop/mobile/light/dark, exclusivamente com dados de fixtures. Campos foram mascarados por precaução; as faixas cinzas são máscaras de captura, não componentes da interface. Evidências A/C anteriores continuam preservadas. Testes em320/375/390/430/768/1024/1440px, teclado, movimento reduzido e WCAG AA.

## Segurança e limites

DEPENDENCY-AUDIT.json detalha os25 achados da árvore completa:14 pacotes HIGH,10 MODERATE,1 LOW; produção6 MODERATE e migrator5 MODERATE, ambos0 HIGH/CRITICAL. Lockfiles e versões preservados:Next/eslint-config-next16.4.2,React/ReactDOM19.2.8. Sem audit fix/overrides/supressão. Os14 pacotes HIGH herdados são @dotenvx/dotenvx,@modelcontextprotocol/sdk,@shadcn/registry,body-parser,eslint-config-next,eslint-plugin-react-hooks,express,express-rate-limit,shadcn,systeminformation,undici,zod,zod-to-json-schema,zod-validation-error. As cadeias/advisories estão no JSON; a árvore de produção é auditada separadamente, sem deduzir presença no runtime pela árvore completa de build/tooling.

Consulte o contrato de segurança para limites de paginação/catálogo, ausência de certificação/upload não verificado/scheduler externo e matriz de autorização. O script manual validate-beta1-copy não concede autorização para migrar15436; apenas valida uma cópia privada identificada. Nenhum segredo, dump ou log bruto é versionado.

## GO/NO-GO

- Homologação local Beta1: CONDICIONADA a CI integral verde no SHA final e ao backup/restauração/migração da cópia do operador antes de atualizar seu banco. Sem esses gates, NO-GO para atualização do banco existente.
- Clínica real/produção/VPS: NO-GO nesta entrega; validação assistencial, aceite humano, infraestrutura e autorização de publicação continuam externos.
- Nenhum PR, merge, deploy, envio externo, mudança de produção ou acesso à VPS foi executado. Laboratório3600/15436, sete contas, senhas, MFA, sessões, registros, volume e `.local` não foram acessados ou alterados.
