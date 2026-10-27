# PAP Admin / Slice F — candidato
PASS: 37 testes de autoridade transacional + 12 de governança = 49 Node; 4 E2E de responsividade, dark/light, teclado/axe, filtros, acesso direto e revogação.
Convites institucionais e mutações de segurança revalidam sessão/MFA/permissão/alvo dentro da transação. Nenhum papel ganha acesso clínico implícito.
Coorte de atores ativos usa o mesmo catálogo de ações das contagens; cartões informam fonte, período UTC, denominadores e estados sem dados, sem métricas fictícias.
Resumo global requer PAP_ADMIN/MFA/permissões efetivas; filtro organizacional não mistura resumo global. Teste de ACL negou tabelas clínicas e credenciais ao leitor de métricas.
Beta/Admin MFA e F04 foram executados separadamente no candidato. Evidência Node: admin-f-node-browser.browser-setup-failure.log (49 PASS, falha posterior de setup), com hash em admin-node-reuse.json. Evidência navegador: admin-f-node-browser.log (4 PASS), em .test-audit/p0-composition/.
Não houve mudança de catálogo IAM, schema adicional administrativo ou migrations históricas.
