# P0 — implementação integral

Branch `codex/p0-full-implementation`; base `e3c0cbc18ffa98be64470a7153b1e798a00fbe14`.
Um agente; worktree independente; nenhum acesso aos laboratórios, banco/volumes/MFA ou VPS do operador.
Especificação e referência lidas uma vez e preservadas em `reference/`. O JS do HTML é apenas referência e não será executado pelo produto.
A instrução mais recente do operador dispensa pausas de aprovação visual descritas no anexo.

## Checklist e limites de esforço

| Etapa | Requisitos / aceite | Dependências | Limite inicial | Estado |
|---|---|---|---|---|
| A | Cartão com fotografia local licenciada, mobile sem foto; LOGIN/MFA/CHANGE reais; labels/autocomplete/senha visível; recuperação neutra, erros de rede reais, confirmação de senha | Asset/licença; contratos auth existentes; testes UI e TS/lint | 45 min | PARCIAL: UI/recuperação PASS; fotografia BLOCKED HTTP 403 |
| B | MFA universal por identidade em guard servidor de toda operação; exceções inscrição/recuperação; CAPTCHA CSPRNG, hash, expiração, origem, consumo atômico, alternativa acessível e limites; adversariais e reset preservam MFA | Inventário restrito dos guards e storage transacional; aprovação de migration se necessária | 60 min | NOT RUN |
| C | Configurações reais com DTO/allowlist e persistência; email/papel/registro não editáveis; dashboard sem mocks nem MEOWS, escopo multi-UBS e Sem dados | Guards existentes, modelos e endpoints reais | 50 min | NOT RUN |
| D | Pendências acionáveis sem filtro inicial, paginação e contagem escopada; notificações reais/idempotentes; navegação rede município→UBS→pessoas; esconder Comercial placeholder | Serviços existentes de IAM/organizações/convites/notificações | 50 min | NOT RUN |
| E | Componentes REAL/DEMO compartilhados, dados separados no servidor; jornadas sintéticas, nenhuma consulta clínica no demo; header claro/sidebar e estrelas IA sem falsa capacidade | Dados/DTOs C; componentes vitrine existentes | 50 min | NOT RUN |
| F | Scroll/teclado/tooltips/responsividade; regressões finais, CI único no SHA final e PR draft | Consolidação A–E | 45 min | NOT RUN |

Cada etapa terá commit/push seletivo do que estiver validado e checkpoint. Requisitos incompletos permanecerão BLOCKED/NOT RUN; não liberam produção. Sem testes completos repetidos ou instalação desnecessária. Se houver bloqueio complexo, continuar apenas tarefas independentes.

## Evidências / próximo passo

- Base e árvore inicial verificadas; só checkpoint pendente anterior.
- Foto `images.pexels.com/photos/6129243/...` e licença `www.pexels.com/license/`: HTTP 403 do proxy, inclusive após concessão de rede. Nenhum asset foi obtido nem licença verificada. Não usar download de origem desconhecida.
- Próximo: implementar shell e recuperação preservando endpoints; validar comportamento direcionado. Fotografia permanece bloqueada até obtenção legítima do asset e licença.

### A — validação e entrega parcial

- `tsx --test tests/p0-full/auth-ui.test.ts`: PASS 6/6; Chromium real, componentes reais compilados com adaptadores Next apenas no teste e endpoints interceptados. Login→MFA, bloqueio temporário, troca forçada, erros de recuperação, confirmação e remoção do bearer, desktop/mobile/dark/teclado/overflow. Não equivale a autenticação real com banco.
- TypeScript e ESLint dos arquivos alterados: PASS. `git diff --check`: PASS. Logs/capturas sem credenciais em `.test-audit/p0-full/`.
- Dependência disponível tinha client Prisma v32: copiada fisicamente para `/tmp/pap-full-deps` e gerado client v34 apenas nessa cópia; typegen Next gerado nesta worktree. Nenhuma instalação, banco ou container utilizado.
- Fotografia/licença: BLOCKED. Ilustração local anterior continua explicitamente como ilustração; nenhuma fotografia foi simulada. Smoke de login/MFA contra backend: NOT RUN nesta etapa.
- Recuperação agora usa mensagens públicas neutras, distingue erros HTTP/rede, bloqueia envio duplicado, confirma senha e limpa token/senha após sucesso; nenhuma alteração aos serviços de reset/token/MFA.
- Próximo: avaliar B nos guards centrais; se storage/contratos exigirem revisão de migration, documentar bloqueio e continuar C independente.
