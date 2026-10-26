# Primeiros passos e autenticador — roteiro do operador e do usuário

Este fluxo pertence à Missão 03 e depende do laboratório do PR #3 enquanto ele
não for integrado por uma pessoa. Não usa VPS, deploy ou e-mail real.

## Preparar em Windows/WSL

No WSL2 Ubuntu com Docker Desktop Linux integrado e Node 22 compatível, use um
checkout limpo, sem arquivos `.env*` ou variáveis de banco remoto. Siga os
pré-requisitos e proteções de [desenvolvimento local](local-development.md).

Se já existe laboratório do PR #3, use **o mesmo checkout e a mesma pasta
`.local`**, preservando senha do PostgreSQL, chave MFA e volume. Com a árvore de
trabalho limpa, faça fetch/switch da branch abaixo; execute `npm ci`, `local:start`,
`local:migrate` e `local:dev`. Não repita `local:admin` para sobrescrever a conta.
Não crie outra configuração em clone diferente para tentar adotar esse volume.
Os comandos completos abaixo destinam-se a um laboratório ainda inexistente.

```bash
git clone --branch develop https://github.com/joaoCarlosGM/pap-saude.git pap-saude-mfa
cd pap-saude-mfa
git fetch origin codex/onboarding-primeiro-acesso-mfa
git switch --track origin/codex/onboarding-primeiro-acesso-mfa
npm ci
npm run local:init
npm run local:start
npm run local:migrate
npm run local:admin
npm run local:dev
```

Os comandos `npm run local:*` também são portáveis ao PowerShell; a regressão
Docker/browser usa Bash no WSL. O provisionamento solicita nome, e-mail e senha
privadamente. Não há senha padrão. Use contatos sintéticos (por exemplo, domínios
`.invalid`) e não reutilize senha real. O PostgreSQL fica em 127.0.0.1:15432, no
volume exclusivo do laboratório. Não copie configurações da VPS.

## PAP_ADMIN: primeiro acesso completo

1. Em janela privada, abra `http://127.0.0.1:3100/login`. Entre com o e-mail e a
   senha definidos no provisionamento. Mantenha exatamente essa origem.
2. Em **Primeiros passos**, confirme o papel PAP_ADMIN e o âmbito global. Clique
   **Começar**, leia a orientação contextual e clique **Continuar**. O link
   **Ir ao controle** move o foco ao controle real; navegue também com Tab/Enter.
3. Informe **Senha atual** e clique uma única vez em **Gerar QR Code**. Isso é
   reautenticação para vincular um fator, não criação de outra senha. Nenhuma
   chave é criada por renderização, visita à página ou atualização automática.
4. No celular, abra Google Authenticator ou outro app compatível com TOTP:
   **+ → Ler QR Code**. Confira emissor **PAP Saúde** e o e-mail da conta.
   Alternativa: **Não consigo ler? Usar chave manual**; selecione chave baseada
   em tempo. A chave é privada e estável durante este cadastro; os códigos mudam
   normalmente a cada 30 segundos. Não capture ou compartilhe essa tela.
5. Clique **Já cadastrei no aplicativo**, digite/cole o código de seis dígitos
   atual e clique **Confirmar código**. O campo não é o de senha nem “nova senha”.
6. Guarde os dez códigos de recuperação em local privado, fora do celular.
   Cada código funciona uma vez no lugar do autenticador no login. Marque
   **Guardei os códigos em um local seguro** e clique **Ocultar códigos e continuar**.
   Eles não podem ser consultados novamente; só hashes são persistidos.
7. Clique **Encerrar sessão e fazer novo login**. Entre com e-mail/senha e depois
   **Código do autenticador ou código de recuperação → Confirmar MFA**. Clique
   **Concluir e acessar minha área**. Só agora a administração estará disponível.
8. Atualize a página e faça outro login: o wizard concluído não reaparece.
   Em `/minha-seguranca` ou `/primeiros-passos?ajuda=1`, **Ajuda / Refazer tutorial**
   exibe orientações sem alterar a chave nem gerar outro fator.

Não se exige que celular e computador exibam o mesmo fuso: precisam refletir o
mesmo instante. Ative data/hora automáticas no celular e a sincronização do Windows.
No WSL, confira `date -u` após suspender/retomar o computador. Não ajuste a tolerância
TOTP do servidor para fazer um teste passar. A política permanece SHA1, seis
dígitos, período de 30 segundos e janela de ±1 período.

## Responsável pela UBS e profissional

Use o roteiro [UBS, aprovação e convites](local-development.md#jornada-institucional-completa-sem-envio-real)
para submeter uma UBS, aprová-la em município ativo e convidar seu responsável.
E-mails ficam apenas na caixa privada do laboratório:

```bash
npm run local:mail
npm run local:mail -- 1
```

Abra o convite em janela privada diferente, defina a senha uma vez e entre.
O aceite mantém a política existente: não cria sessão automaticamente. O login
com a senha nova conduz ao wizard; a autorização de vínculo MFA pede a senha
atual por política de reautenticação. HEALTH_UNIT_ADMIN precisa completar os
passos 2–7 acima. Depois do login MFA, só pode administrar sua própria UBS.

Convide um profissional dessa UBS e repita o aceite/login em outra janela.
PROFESSIONAL vê o papel e a unidade efetivos. MFA é **recomendado**, conforme a
política existente: pode usar **Configurar depois e continuar** na explicação ou
configurar pelo mesmo roteiro. Ao ativar MFA, os próximos logins passam a exigir
challenge TOTP/recuperação. Nenhuma permissão administrativa ou acesso a outra UBS
é concedido pelo tutorial. Não altere políticas clínicas para homologar a UI.

## Retomar, corrigir e testar erros com segurança

- **Sair do tutorial / Escape:** pausa as explicações; **Retomar configuração**
  continua sem criar segredo. Isso não dispensa MFA obrigatório para admin.
- **Voltar na mesma aba:** **Continuar com a chave atual** conserva a mesma chave.
- **Reload com cadastro pendente:** a chave não fica em localStorage ou em GET.
  Confirme a substituição e clique **Gerar nova chave**. Atualize/remova a entrada
  anterior no autenticador; ela deixa de funcionar. Outra aba pode ter feito isso.
- **Código inválido ou expirado:** use os seis dígitos da conta correta e a hora
  automática. Não atribua todo erro ao relógio: confira a mensagem exibida.
- **Configuração expirou:** validade de dez minutos. Reinicie explicitamente.
- **Senha/fator incorreto na reautenticação:** confira os campos correspondentes;
  falhas repetidas têm limite durável e backoff. Não faça força bruta manual.
- **Sessão expirou:** novo login retoma o progresso do mesmo usuário.
- **Origem recusada:** use a mesma origem 127.0.0.1 do laboratório, sem alternar
  para localhost. Não desligue CSRF/origin.
- **Reload após ativar e antes de guardar recuperação:** a UI não exibe os códigos
  novamente. Autorize um novo conjunto com senha e TOTP; os anteriores são revogados.
- **MFA já ativo:** o wizard não troca silenciosamente a chave. Use o fluxo legítimo
  de recuperação se perder o aparelho. Não edite `mfaVerifiedAt` nem o banco.

Para testar recuperação, encerre a sessão, entre com senha e use um código de
recuperação no challenge. Tente reutilizá-lo em outro login: deve ser recusado.
Se acabou de consumir um TOTP em ação sensível, aguarde o próximo código antes
de outro login. Ajuste de relógio no navegador não altera a validação do servidor.

## Evidências e limites

[Desktop](../evidence/missao-03/desktop-boas-vindas.png),
[mobile 320px](../evidence/missao-03/mobile-320.png),
[modo escuro](../evidence/missao-03/desktop-escuro.png),
[QR mascarado](../evidence/missao-03/qr-mascarado.png) e
[recuperação mascarada](../evidence/missao-03/recuperacao-mascarada.png).
As áreas privadas e todos os inputs são mascarados antes da captura. Nunca remova
as máscaras para produzir material de suporte.

Regressão reproduzível (somente PostgreSQL descartável dos testes, com label
`pap.disposable=f0410`; não use o volume manual como banco de testes):

```bash
npm run test:first-access
npx playwright install --with-deps chromium
npm run test:first-access:browser
```

O harness cria `pap_saude_onboarding_test` no container descartável `pap_saude_db`
e remove apenas esse banco fixo ao terminar. Usa porta 3110 e build separado,
sem reutilizar servidor ou banco manual. A captura é feita em Chromium; Playwright
não registra vídeos, traces ou snapshots DOM privados, e o reporter remove logs
dinâmicos de erro. O teste usa TOTP real derivado do QR, API e sessões reais,
sem falsificar uma sessão MFA. QR é decodificado offline e validado por teste.

**Pendente externo:** leitura com Google Authenticator em aparelho físico,
Windows/WSL do operador, leitor de tela real e Safari/iOS. Não há integração com
API Google; o padrão `otpauth://` interoperável é usado. A validação automatizada
não substitui esses testes nem autoriza produção. E-mail real, VPS e deploy estão
fora deste procedimento.
