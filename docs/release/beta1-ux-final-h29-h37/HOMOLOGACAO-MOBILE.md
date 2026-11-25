# Homologação móvel

Use o perfil do [roteiro WSL](HOMOLOGACAO-WSL.md) em rede privada e um certificado confiável para o IP de bind. [Como configurar CA, rede espelhada ou NAT](../beta1-final-local/HOMOLOGACAO-MOBILE.md#certificado-confiável)

```bash
export PAP_PRIVATE_ORIGIN='https://<IP-PRIVADO>:34443'
export PAP_PRIVATE_BIND='<IP-PRIVADO-DO-WSL>'
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve \
  --profile "$PAP_ID_REVIEW_PROFILE" --mobile-origin "$PAP_PRIVATE_ORIGIN" \
  --bind "$PAP_PRIVATE_BIND" --tls-cert '/caminho/lan-cert.pem' \
  --tls-key '/caminho/lan-key.pem'
```

1. Acesse `/homologacao/parear`, informe o código temporário e autorize a sessão pela Vitrine.
2. Confira a ordem dos cards em retrato/paisagem, a rolagem do calendário, as tabelas em formato de cartão e a legibilidade no tema escuro.
3. Com o teclado virtual aberto em um resultado de exame, teste validação, **Continuar editando**, descarte e recuperação de foco. Repita no formulário de documento.
4. Abra frente e verso da PAP-Gest, baixe o PDF e leia o QR com ação explícita. Teste zoom, pan e movimento reduzido nos três fluxogramas.
5. Encerre o acesso em `/homologacao/acesso`. Registre aparelho, navegador, versão, SHA e resultado. Mascare QR, CPF e qualquer sessão ativa nas capturas.
