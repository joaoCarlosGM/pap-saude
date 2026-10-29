# Correção dirigida — contrato de leitura dos contadores Admin F

Branch feature/p0-premium-unified-rc; parent47b46e449aedbf61963f33b667007dd12b1c591b. CI40942540263 falhou em tests/release/governance.spec.ts:59. O operador forneceu o primeiro erro.

## Causa comprovada

O teste lia allTextContents do p inteiro após a adoção de AnimatedMetric. Cada contador contém reserva visual aria-hidden, texto animado aria-hidden e valor final sr-only. A reprodução retornou [000,000,000,000] para valores reais [0,0,0,0]. Não era erro no cálculo ou falha do Axe: a asserção ocorria antes da auditoria. Reprodução privada /tmp/pap-unified-evidence/admin-count-reproduction.json (somente contagens sintéticas).

## Correção

Somente tests/release/governance.spec.ts: comparar os quatro valores sr-only uma única vez com a resposta autenticada real da API e, independentemente, aguardar o texto visível de cada contador alcançar esse mesmo valor. Fixture COMMERCIAL legítima, criada pelos serviços existentes com MFA real, garante valor não nulo e animação efetivamente iniciada. Nenhum mfaVerifiedAt falsificado. Nenhuma constante substitui a fonte de dados.

Mantidos os asserts de tamanho, disclosure/teclado, contraste WCAG AA, erros JS, origem externa, filtros de organização, negativas Manager/Commercial/UBS Admin e revogação. Backend, consultas de KPI, permissões, dados operacionais, MFA, migrations, aplicação e CI/CD não foram alterados. Nenhum timeout aumentado.

## Evidências

| Execução | Resultado |
|---|---|
| Apenas cenário falho em PostgreSQL novo com CID/UUID/credencial próprios | PASS1;320/768/1440,claro/escuro |
| Quatro jornadas governance.spec.ts sequenciais no mesmo banco descartável | PASS4/4 |
| npx tsc --noEmit / ESLint dirigido / git diff --check | PASS / PASS / PASS |
| Build/Docker/auditoria global local | Não repetidos: nenhuma mudança da aplicação ou de dependências |

Comando do harness: PATH=/tmp/pap-unified-node22/bin:$PATH node /tmp/pap-unified-evidence/reproduce-admin-governance.mjs browser. Ele altera somente a seleção de recursos descartáveis/origens/porta do launcher, preservando os testes e guards. Log privado /tmp/pap-unified-tests-1dTu97/browser.log; hashes em VALIDATION.json.

CI47b46e4 avançou por E, F03 e Auth/MFA; na etapa P0, chegou ao browser Admin F após os comandos anteriores. O próximo candidato ainda exige CI completo e os gates seguintes, incluindo runtime clínico, imagens e Trivy. Não se presume PASS para o que não executou. NO-GO de release/VPS continua.

Nada foi alterado em laboratórios antigos, credenciais/MFA/contas/bancos/volumes do operador ou VPS. Sem merge, PR, deploy, e-mail externo ou push de produção.
