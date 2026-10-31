# PAP Comercial Beta 1 — teste e homologação controlada

## Versão e entrega

Branch exclusiva `feature/admin-beta-commercial-b1`, base
`2c8b5134942293e7bd1795084469270a6da2bb90`. C00 `9318247` (inventário),
C01 `4e2371a` (opt-in e fronteiras), C02 `4214acd` (workspace) e C03 (catálogo
finito, jornadas e validação de produção) identificados no histórico desta branch.
Consultar `C00-INVENTARIO.md`, `C01-ACESSO.md`, `C02-WORKSPACE.md` e
`C03-VITRINE.md` para os inventários e resultados reais. SHA/CI final no resumo de entrega.

Reutilização: CommercialWorkspace, ThemeToggle, NotificationInbox, OwnProfileSettings,
serviços de perfil/notificações, guard Commercial, destinos de login/primeiro acesso,
CAPTCHA e MFA, PremiumSectionView, DemoProvider em memória, tutorial e motor
exclusivamente demonstrativo. Não há novo lead, CRM ou venda persistida prometida.

## Permissões e disponibilidade

| Contexto | Workspace/Vitrine | Admin | Clínica/LMS operacional na Beta |
|---|---|---|---|
| Opt-in0, ausente ou inválido |404| Fluxos aprovados preservados |404|
| Sem sessão |Redirect login nas páginas liberadas| Guards existentes |404|
| COMMERCIAL global + commercial.read + MFA verificado |Permitidos no catálogo finito|403 nas APIs privilegiadas|404|
| COMMERCIAL primário/MFA pendente ou revogado |Somente aviso de reautenticação, sem workspace|Negado|404|
| PAP_ADMIN/PAP_MANAGER sem concessão COMMERCIAL explícita |Negado; sem preview implícito| Conforme IAM/MFA anteriores |404|

Notificações e perfil são exclusivamente da identidade atual. Nome é editável com
CSRF/auditoria; roles, e-mail e vínculo não são concedidos pelo editor. Vitrine possui
perfil e instituições fictícias, sem vínculo com organizações reais. Não inserir dados
pessoais nem clínicos reais. O cálculo demonstrativo não habilita uso assistencial.

## Teste local reproduzível (checkout novo; não usar laboratórios existentes)

Requisitos: Node22, Docker local autorizado, Chromium/Playwright. Escolha diretório novo,
fora de qualquer laboratório. Não executar comandos abaixo no checkout do operador.

```bash
git clone --branch feature/admin-beta-commercial-b1 --single-branch https://github.com/joaoCarlosGM/pap-saude.git pap-commercial-beta-review
cd pap-commercial-beta-review
npm ci
npx prisma generate
npx playwright install chromium
npx tsx --test tests/commercial-beta/availability.test.ts tests/commercial-beta/rsc-metadata.test.ts tests/admin-beta-deployment/policy.test.ts tests/admin-beta-deployment/deployment.test.ts
node tests/beta1/run-isolated.mjs commercial
NODE_ENV=production PAP_FIRST_ACCESS_E2E=0 DATABASE_URL=postgresql://build_no_connect:unused@127.0.0.1:1/commercial_build_only npm run build
node tests/beta1/run-isolated.mjs commercial-browser
```

O runner cria PostgreSQL tmpfs com UUID/ownership, porta127.0.0.1 efêmera e banco
`pap_beta1_test`, aplica migrations apenas nesse recurso novo, cria identidades sintéticas
por serviços reais e usa runtime separado no web. Escolhe porta web livre e falha em vez
de reutilizar servidor. Limpa apenas recursos cuja propriedade tenha sido comprovada.
Não usa5432/15436, não altera o laboratório3600 e não envia e-mails. Não copiar valores
privados dos logs; eles ficam em diretório temporário com permissão restrita.

Para inspeção interativa dessa bateria em Linux/WSL com interface gráfica:

```bash
PWDEBUG=1 node tests/beta1/run-isolated.mjs commercial-browser
```

O Playwright Inspector permite acompanhar/pausar os cenários com suas sessões sintéticas.
É ambiente descartável, não substitui o deployment nem cria credenciais fixas públicas.
Fechar a execução libera somente os recursos criados por ela. Em máquinas sem GUI,
use o modo headless anterior e as capturas aprovadas em `evidence/`.

## Homologação manual futura da Beta — não executada nesta missão

1. Conferir SHA exato e SUCCESS do workflow **PAP Commercial Beta validation (no
   publication)**. Publicação das imagens e ativação na VPS exigem autorização separada.
2. Em janela aprovada, preservar compose/secrets/volumes/imagem anterior e registrar
   backup conforme runbook Admin Beta. Não executar `prepare.mjs` em instalação existente,
   bootstrap de nova conta, seed, reset ou rotação de MFA. Não há migration nova nesta missão.
3. Usar versão web construída a partir do SHA aprovado. Configurar
   `PAP_ADMIN_BETA_ONLY=1` e `PAP_BETA_COMMERCIAL_ENABLED=1`. No template Nginx desse
   mesmo release, usar o conteúdo de `routes.commercial.map.conf` no include
   `routes.map.conf`. Fazer revisão/syntax check antes de qualquer reload autorizado.
   Não liberar `/vitrine/` por prefixo nem expor3101 publicamente. Preservar token
   privado do proxy, client IP confiável, HTTPS, origens e cookies Secure existentes.
4. Por PAP_ADMIN já autenticado com MFA, convidar/autorizar uma identidade de teste para
   COMMERCIAL global usando o fluxo existente. Não conferir PAP_ADMIN/Manager ao Comercial.
   Primeiro acesso deve manter consentimento, configurar fator próprio e confirmar MFA.
5. Login Commercial verificado termina `/comercial`; primário/MFA pendente não monta
   workspace. Logout encerra a sessão e volta ao login sem loop. MFA/Admin antigos intactos.
6. Verificar nome/e-mail reais da própria conta; salvar nome e recarregar. Receber/ler
   notificação própria pelo fluxo real de convite; não visualizar notificações de outra
   conta. Segurança da conta utiliza a tela existente, sem redefinir fator para testar UI.
7. Abrir Vitrine; confirmar avisos, tutorial de seis etapas e Ajuda. Navegar por todos os
   módulos/aulas, cadastrar somente pessoa fictícia no Registro, consultar ficha e
   Dashboard. Recarregar/restaurar deve descartar o estado sintético; banco não recebe
   atendimento. Dados incompletos não produzem classificação normal falsa.
8. Confirmar negativas por URL/HTTP/RSC/API: IDs reais/UUIDs na Vitrine, seções desconhecidas,
   verbos de escrita, clínica/LMS reais e APIs administrativas. Remover a concessão de uma
   conta descartável pelo fluxo autorizado e confirmar negação na próxima requisição.
9. Desktop/mobile320/375/768/1440, claro/escuro, teclado/Escape/foco, notificações vazias,
   falha de transporte/retry e coexistência dos fluxos PAP_ADMIN/PAP_MANAGER.

## Retorno operacional e limites

Para desativação futura autorizada: opt-in0 e mapa default da mesma versão; manter banco,
volume e segredos. Retorno da imagem deve usar a versão anterior aprovada e seu mapa,
sem recriar conta/MFA. Isso não é rollback de banco; não há alteração de schema a reverter.
Não executar `down -v`, reset, seed ou preparar diretório sobre instalação existente.

Pendentes: publicação autorizada das imagens (não realizada), homologação humana na
Beta e decisão de ativação. Scanners/CI falhos impedem GO. Aprovação funcional aqui
não representa autorização de deploy nem GO para uso clínico/produção.
