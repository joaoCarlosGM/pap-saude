# Homologação em aparelho físico

Use o perfil desta candidata, uma rede privada e um certificado confiável para o IP do WSL. O guia anterior descreve a geração da CA e a configuração da rede. [Certificado confiável](../beta1-final-local/HOMOLOGACAO-MOBILE.md#certificado-confiável)

```bash
export PAP_PRIVATE_ORIGIN='https://<IP-PRIVADO>:34443'
export PAP_PRIVATE_BIND='<IP-PRIVADO-DO-WSL>'
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve \
  --profile "$PAP_ID_REVIEW_PROFILE" --mobile-origin "$PAP_PRIVATE_ORIGIN" \
  --bind "$PAP_PRIVATE_BIND" --tls-cert '/caminho/lan-cert.pem' \
  --tls-key '/caminho/lan-key.pem'
```

Acesse `/homologacao/parear` no aparelho e use o código exibido no terminal. Autorize a consulta privada em **Configurações**. Faça o teste com dados sintéticos em retrato, paisagem, tema claro e escuro e movimento reduzido. Em cada editor confira teclado virtual, campo inválido, foco, seletores de data e hora, lista de PDF, rolagem, cancelar e salvar. Teste download de PDF, links da Timeline, troca de abas, câmera e PAP-ID por ação explícita. Finalize o acesso do aparelho em `/homologacao/acesso`.

Anote dispositivo, sistema, navegador, orientação, SHA e resultados. Guarde evidências sem código de pareamento, QR ativo ou material privado.
