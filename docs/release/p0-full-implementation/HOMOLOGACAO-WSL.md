# Revisão segura no WSL, sem atualizar os laboratórios existentes

Não executar estes comandos em `pap-saude-onboarding` nem em `pap-saude-p0-acceptance`. Não copiar `.env`, `.local`, senhas, MFA ou dados. O procedimento abaixo valida automaticamente dados sintéticos em recursos efêmeros; não provisiona uma nova conta operacional persistente e não substitui aceite manual.

Pré-requisitos: Node 22 compatível, Git, Docker local e Chromium/Playwright disponíveis. Em terminal WSL novo:

```bash
set -euo pipefail
PAP_REVIEW_DIR="$HOME/projetos/pap-saude-p0-full-review"
test ! -e "$PAP_REVIEW_DIR" || { echo 'Destino existente: pare para preservar seu conteúdo.'; exit 1; }
mkdir -p "$HOME/projetos"
git clone --single-branch --branch codex/p0-full-implementation \
  https://github.com/joaoCarlosGM/pap-saude.git "$PAP_REVIEW_DIR"
cd "$PAP_REVIEW_DIR"
git rev-parse HEAD
DATABASE_URL='postgresql://install_only:install_only@127.0.0.1:1/pap_install_only?schema=public' npm ci
# Somente se não houver Chromium/Playwright instalado:
npx playwright install chromium
npm run test:p0:full
```

A URL da instalação é inacessível e não aplica migrations. O runner cria um container próprio, com labels e nome exclusivo, PostgreSQL em porta aleatória de loopback, storage tmpfs e credenciais descartáveis; valida propriedade, aplica migrations somente nele e remove somente o recurso criado. Não usa bancos/containers/volumes dos laboratórios do operador, não envia emails e executa as suítes sequencialmente.

Não execute `local:init`, `local:admin`, `local:p0 migrate`, reset ou troca de branch nos laboratórios existentes para tentar este candidato. Homologação manual persistente requer um ambiente adicional explicitamente autorizado ou atualização planejada pelo operador, com backup e CI revisados. Não iniciar essa atualização automaticamente.

Checklist manual pendente, para esse ambiente autorizado: login/CAPTCHA, TOTP de cada papel, recuperação sem perda do fator, repetição de login sem wizard, nome próprio após F5, dashboard por UBS sem dados fictícios, fila NEW/READY/aceite, aprovação sem alterar papel consentido, hierarquia e convites da UBS, notificação/deep link/leitura, sessão Comercial sem clínica, ficha e etapas DEMO sem escrita real, registro idempotente e negação de escrita após COMPLETED. Usar perfis separados de navegador: portas diferentes no mesmo host não isolam cookies.

A fotografia e o build/CI ainda têm bloqueios registrados em `VALIDACAO.md`. Este roteiro não é GO de produção nem autorização de deploy.
