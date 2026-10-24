# Homologação dos e-mails — Slice D

## Limites e laboratório

Resend implementado; **envio externo NÃO EXECUTADO e NÃO HOMOLOGADO**. Não há autorização para alterar DNS, VPS, domínio, secrets, criar túnel ou expor o laboratório. O PR #5 permanece draft. D depende de revisão; E permanece bloqueado até aprovação e versionamento de D.

O laboratório existente continua privado em `http://127.0.0.1:3100`, com `PAP_EMAIL_PROVIDER=local-demo`, `PAP_LOCAL_DEMO=1` e sua configuração original. Não trocar para Resend, resetar banco/volume, repetir `local:init`/`local:admin`, mudar senha, chave ou MFA do PAP_ADMIN. Esta documentação não autoriza atualizar o laboratório.

Somente após autorização específica: seguir upgrade in-place da especificação principal, com backup privado e migrations forward-only previamente testadas. Executar no WSL, na branch de homologação existente. Não copiar `.local` para outro checkout nem apontar suítes destrutivas para o banco manual.

Roteiro manual futuro:

1. Solicitar recuperação no login para uma **conta sintética**, nunca para o PAP_ADMIN preservado. A resposta não confirma existência de conta.
2. No worktree/WSL já configurado, executar `npm run local:mail`. A caixa é privada: HTML/JSON contêm links sigilosos; não compartilhar, fotografar ou versionar.
3. Abrir a mensagem local e o link de redefinição. Fragmento, validade de 30 minutos, uso único. Redefinir somente a senha sintética escolhida.
4. Validar novo login: sessões anteriores dessa conta são revogadas; MFA previamente ativo continua exigido. Links expirados/reutilizados são negados.
5. Convidar destinatário sintético, conferir nome/papel/validade, aceitar, aguardar e aprovar **o mesmo papel**. Conferir notificação persistente e mensagem de liberação. Aceite não concede privilégios; perfil autorizado não ativa UBS.
6. Ativação de UBS: PAP_ADMIN, unidade de teste, responsável legítimo com Membership ACTIVE + RoleAssignment HEALTH_UNIT_ADMIN na própria unidade. Contato público isolado ou profissional comum não é destinatário. Sem responsável elegível, não enviar aviso.
7. Repetir ACTIVATE autorizado em UBS já ativa tenta apenas recibos PENDING/FAILED existentes; não cria outro evento/destinatário. Nova ativação após suspensão tem outro recibo. Rejeição/revogação de convite aceito envia aviso genérico deduplicado, sem motivo privado ou identidade do revisor.

## Configuração externa futura

Requer autorização posterior, ambiente controlado, URL HTTPS acessível, domínio/remetente verificados no Resend e destinatários de teste consentidos. Nunca publicar o laboratório loopback.

Variáveis **somente do servidor**, em secret manager/configuração privada, sem `NEXT_PUBLIC_`:

| Variável | Contrato |
|---|---|
| `PAP_EMAIL_PROVIDER` | `resend`, sem fallback local |
| `PAP_EMAIL_EXTERNAL_ENABLED` | `1`, opt-in explícito adicional |
| `PAP_PUBLIC_URL` | Origem HTTPS sem credenciais/path/query/fragmento; hostname público |
| `PAP_EMAIL_ALLOWED_HOSTS` | Allowlist exata de `host[:port]` |
| `PAP_EMAIL_FROM` | Endereço simples ou `PAP Saúde <endereço>` validado no provedor |
| `PAP_EMAIL_ALLOWED_SENDERS` | Allowlist exata dos endereços de remetente, separados por vírgula |
| `RESEND_API_KEY` | Secret de envio do ambiente controlado |
| `RESEND_WEBHOOK_SECRET` | Secret Svix `whsec_…` desse endpoint/ambiente |
| `AUTH_ALLOWED_ORIGINS` | Preservar política CSRF para origem legítima |

Código rejeita HTTP, IP literal, localhost/domínios internos conhecidos, origem/remetente fora das allowlists, configuração incompleta e provider desconhecido. Resend também é negado com `PAP_LOCAL_DEMO=1`, `PAP_LOCAL_DEMO_TEST=1`, qualquer `PAP_LOCAL_MAIL_TEST_DIR` ou nome de banco `pap_admin_beta1_local`, mesmo com origem HTTPS/allowlists válidas. Não remover esses bloqueios para enviar a partir do laboratório. Allowlist é declaração do operador, **não prova de domínio validado**; provedor/operador devem comprovar DNS/remetente e HTTPS antes de habilitar.

Checklist externo — todos os itens dependem de autorização/homologação:

- Verificar SPF/DKIM conforme Resend, sem substituir registros existentes sem aprovação. Revisar SPF único/limites, DMARC e alinhamento; política e relatórios privados definidos pelo operador.
- Confirmar sandbox, destinatários permitidos, quotas, restrições de conta/domínio e região. HTTP 2xx não comprova inbox.
- Configurar HTTPS `POST /api/email/resend/webhook`: `email.delivered`, `email.bounced`, `email.complained`, `email.failed`.
- Proxy preserva bytes do corpo, limite 64 KiB, relógio sincronizado. Verificação Svix/HMAC SHA-256 de `svix-id.timestamp.raw`, tolerância de 5 minutos. Assinatura máquina-máquina substitui cookie/CSRF nessa única rota.
- Validar retries do provedor em não-2xx e monitorar 503, inclusive corrida entre callback e commit de aceite. Eventos conhecidos sem mensagem correspondente pedem retry; eventos assinados não utilizados são ignorados. Não publicar payloads.
- Redigir tokens, corpos e destinatários em proxy/APM/analytics. Não habilitar tracking de cliques para links portadores de segredo. E-mails institucionais novos usam fragmento; links legados em query continuam aceitos e exigem redação no proxy até retirada planejada.
- Testar Gmail, Outlook, Apple Mail reais. Chromium/axe não comprovam renderização em todos os clientes de e-mail.
- Somente após autorização de envio: destinatários consentidos, webhook, bounce controlado, resend, revogação e falha do provider. Guardar evidência sanitizada. Nenhum envio real foi executado nesta missão.

## Estados, idempotência e falhas

- CAPTURED: arquivo privado criado, **nenhum envio externo**.
- ACCEPTED_BY_PROVIDER: Resend retornou ID; não comprova entrega.
- DELIVERED: callback autenticado comprova entrega ao servidor destinatário; não comprova leitura, abertura ou inbox.
- BOUNCED, COMPLAINED e FAILED são distintos. Entrega atrasada não apaga bounce/reclamação/falha.
- NOT_REQUESTED: explicitamente desabilitado/cancelado. SENT/DEVELOPMENT legados permanecem intactos, com rótulos honestos.
- Hash da identidade lógica + fingerprint do conteúdo; mesma identidade com conteúdo/provider diferente é negada. Locks PostgreSQL coordenam workers. Resend recebe chave estável. Retry ambíguo é bloqueado após 23 horas, antes da janela de 24 horas do provider. Não apagar ledger para contornar.
- Sem worker automático de retries/outbox. A emissão de recuperação roda após a resposta com `after()`; não é fila durável. Liberação: RETRY_NOTICE autorizado/MFA. Fechamento aceito: repetir ação legítima. Ativação: ACTIVATE autorizado tenta recibos existentes. Convite sem envio é revogado e requer RESEND legítimo/token novo. Reset sem envio revoga token; novo pedido respeita quotas.
- Crash entre commit do convite e envio: hash não permite recuperar token original; reenviar legitimamente. Não alegar exactly-once entre PostgreSQL/Resend/disco. Conteúdo de retry é imutável: mudança de nome/destinatário/configuração exige investigação e novo evento legítimo.
- Recuperação responde 202 antes de consultar identidade/quotas/DB ou iniciar transporte. Usa callback `after()` do Next (não promise já iniciada); testes de ordem e HTTP real com SQL bloqueado comprovam a separação. `accepted` significa pedido recebido, não conta existente ou e-mail enviado. O processamento continua sujeito às quotas e revoga o token se o transporte falhar. `after()` não é fila durável: encerramento abrupto do processo pode perder o pedido; solicitar novamente, respeitando limites. Acompanhar o código fixo `PASSWORD_RESET_BACKGROUND_FAILED`, sem registrar exceções ou dados do pedido. Homologar desligamento gracioso/timeouts da hospedagem antes da exposição pública; não se promete tempo constante sob toda saturação de infraestrutura.
- Mensagem já capturada/aceita não pode ser recolhida após revogação concorrente. Texto descreve evento histórico e manda consultar situação atual; IAM/MFA/vínculo atuais continuam decidindo acesso.
- Ledger não guarda corpos, endereços ou links, apenas hashes/status/referências/ID do provider. Recibos de ativação guardam IDs e nome da unidade do evento, sem dados clínicos. Retenção/minimização e caixa privada exigem política operacional; nenhum job apaga o laboratório nesta entrega.

Referências oficiais: [API](https://resend.com/docs/api-reference/emails/send-email), [idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys), [webhooks](https://resend.com/docs/dashboard/webhooks/introduction), [domínios](https://resend.com/docs/dashboard/domains/introduction), [Svix](https://docs.svix.com/receiving/verifying-payloads/how).
