# Homologação em Android e iPhone

Use o perfil privado do [roteiro WSL](HOMOLOGACAO-WSL.md) e o procedimento de [CA, rede espelhada ou NAT](../beta1-final-local/HOMOLOGACAO-MOBILE.md#certificado-confiável). Use uma origem HTTPS privada exata, sem túnel público, e um certificado aceito pelo telefone. O launcher só aceita portas isoladas e exige a chave com permissão `0600`.

```bash
export PAP_REVIEW_PROFILE='/caminho/absoluto/do/perfil-review.json'
export PAP_PRIVATE_ORIGIN='https://<IP-PRIVADO>:34443'
export PAP_PRIVATE_BIND='<IP-PRIVADO-DO-WSL>'
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve \
  --profile "$PAP_REVIEW_PROFILE" --mobile-origin "$PAP_PRIVATE_ORIGIN" \
  --bind "$PAP_PRIVATE_BIND" --tls-cert '/caminho/lan-cert.pem' \
  --tls-key '/caminho/lan-key.pem'
```

No mesmo Wi-Fi, abra `/homologacao/parear` na origem privada e use o código do terminal. Em **Configurações**, autorize a consulta privada. Abra Registro, permita câmera traseira, leia uma carteirinha de teste e confira que a câmera para. Faça a segunda leitura via **Adicionar mais carteirinhas**. Confira permissão negada, retorno do segundo plano, rotação, teclado físico se disponível e o QR impresso. Nos Protocolos, confira o mapa em retrato e paisagem, pan por toque, alternância para figura original e download. Termine em `/homologacao/acesso` e encerre somente o acesso deste dispositivo.

Registre aparelho, navegador, versão, orientação, resultado e SHA. Use capturas sem QR ativo, credenciais, certificados, anexos ou código de pareamento.
