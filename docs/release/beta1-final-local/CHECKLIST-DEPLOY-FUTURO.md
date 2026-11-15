# Publicação futura — roteiro de revisão, não executado

**NO-GO para publicação neste momento.** Candidata destina-se à homologação privada. Não há PR, merge, deploy, envio de imagem ou acesso à VPS nesta missão. Imagem atual de referência permanece intocada:
`ghcr.io/joaocarlosgm/pap-saude-admin-beta@sha256:a536276abc4a67335df11d5e54820297d0a49c24d03241cbb02eee02d3384b1c` (commit0e0a2d8).

## Antes de qualquer publicação

- [ ] Operador homologa desktop, Android/iPhone, câmeras e conteúdo; aprova o SHA exato.
- [ ] Responsável institucional valida resumos, transcrições/adaptações, páginas, versões, divergências e direitos dos três PDFs. Sem autorização, manter originais indisponíveis publicamente.
- [ ] Segurança revisa os riscos de dependências atuais e exige CI/scanners completos no SHA candidato. Esta branch não foi adicionada automaticamente às allowlists do CI.
- [ ] Preparar comparação offline de configuração/imagem aprovada; não pressupor estado de VPS. Comparação Git/motion está em INVENTARIO-G0 e evidence/motion-runtime.
- [ ] Revisar rotas finitas, cookies Secure, MFA e concessão global COMMERCIAL + commercial.read. Sessão administrativa não recebe acesso clínico nem concessão Comercial implícita.
- [ ] Manter Cursos/Chat IA da Vitrine como texto “Em breve”; LMS operacional permanece independente.

## Build e artefatos

1. Checkout limpo do SHA aprovado, lockfile fixo, Node/base Docker pinados. Executar build real, TypeScript/lint, testes, Dockerfile canônico web/migrator, Trivy HIGH/CRITICAL e auditorias. Tags de imagem imutáveis novas, nunca sobrescrever a referência existente.
2. Final runtime usa apenas standalone, static e public. Excluir `.local`, perfil, senha, chave AES/TLS/CA, PNGs emitidos, documentos privados, logs, backups e dados de teste. Inspecionar tar final, manifestos e bundles; HTTP/RSC `/homologacao/**` deve retornar404 mesmo com flags privadas.
3. **Não empacotar nem executar a fixture, mobile-edge, review-lab, banco review ou código de pareamento em produção.** Não abrir porta de dev/HTTPS de homologação na VPS. A fixture não autentica contas reais e nunca substitui o P0.
4. As mudanças desta missão não incluem migrations Prisma. SQL `scripts/private-review/sql` pertence somente ao PostgreSQL sintético; não aplicá-lo no banco Beta/produção ou no laboratório3600.

## Documentos e persistência

O público ainda não tem armazenamento institucional de PDFs autorizado. Um recurso futuro exigirá storage privado, autorização por conta/escopo, download controlado, auditoria, política antimalware, tamanho/retencão e direitos de uso. Não converter o ingresso LAN em API pública. Cadastros/cartões/documentos review são sintéticos e não devem ser promovidos ao banco clínico. MEOWS assistencial permanece desativado; demonstração não é validação clínica.

## Infraestrutura — só após autorização separada

- [ ] Operador fornece inventário read-only da VPS/compose/Nginx, digest atual, portas, rede, volumes, secrets, TLS e healthchecks; nenhuma evidência presumida.
- [ ] Avaliar compatibilidade com o deployment Admin Beta/Comercial, mantendo allowlists Next/Nginx equivalentes e sem prefixos amplos, métodos extras ou bypass MFA.
- [ ] Backup operacional criptografado e restauração ensaiada em destino independente, sob responsabilidade do operador. Backup de profile/chave e volume review, se desejado, permanece separado e privado.
- [ ] Revisar logs sem tokens/URLs sensíveis, limites, proxy confiável, HTTPS e política de documentos; nenhuma alteração de DNS nesta missão.

## Ativação e retorno operacional propostos

Após nova autorização: publicar nova imagem em ambiente de homologação separado, verificar healthcheck, login/MFA, papel Comercial, protocolos e negativas clínicas/Admin. Validar coexistência com aplicação anterior e persistência do banco correto. Só depois avaliar troca controlada de upstream. Nenhum comando remoto é fornecido como execução automática.

Se o release falhar: retornar à imagem/upstream anterior mantendo volume/banco intactos. Retorno de imagem não reverte SQL; nesta missão não há migration operacional. Se uma futura alteração de dados exigir recuperação, usar backup verificado/roll-forward com aprovação humana. Registrar SHA/digest, horário, evidência e responsável. Nunca restaurar dados review sobre dados clínicos.
