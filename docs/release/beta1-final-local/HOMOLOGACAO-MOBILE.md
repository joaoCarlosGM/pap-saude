# HTTPS privado em LAN — WSL, Windows, Android e iPhone

Somente homologação sintética temporária, sem túnel público, DNS público ou VPS. Não mudar o modo de rede do WSL, reiniciar WSL/Docker ou alterar serviços existentes. O backend Next permanece em127.0.0.1, porta aleatória. Um ingresso HTTPS próprio aceita apenas IP privado exato, rede privada, origem exata e pareamento temporário. Bloqueia APIs operacionais, páginas clínicas, Admin, cursos e chat pausados. Não é infraestrutura de produção.

## Certificado confiável

Identifique o IPv4 privado da máquina na LAN e, no WSL, `ip -4 addr` / `ip -4 route`. Escolha porta inédita, por exemplo34443; confirme livre (`ss -ltn` no WSL; `Get-NetTCPConnection -LocalPort 34443 -ErrorAction SilentlyContinue` no PowerShell). O launcher recusa wildcard, IP público, HTTP e portas dos laboratórios conhecidos.

Use mkcert instalado pelo operador e uma CA privada **somente para esta homologação**, em diretório protegido. Não usar certificados/segredos de produção. Exemplo no WSL:

```bash
umask 077
mkdir -p .local/mobile-ca .local/mobile-tls
export CAROOT="$PWD/.local/mobile-ca"
export PAP_MOBILE_IP='192.168.1.50' # substituir pelo IP LAN real do computador
mkcert -cert-file .local/mobile-tls/cert.pem -key-file .local/mobile-tls/key.pem "$PAP_MOBILE_IP"
chmod 600 .local/mobile-tls/key.pem
```

Não desativar validação TLS nem usar “continuar inseguro” para homologar câmera. Confiar nessa CA nos dispositivos requer ação consciente do operador. Copiar **somente rootCA.pem**, nunca rootCA-key.pem, chave TLS, profile.json ou banco. No Windows importar a CA no repositório de usuário confiável. No Android instalar certificado CA pelo painel de segurança e validar Chrome; fabricante/política corporativa podem impedir. No iPhone instalar o perfil CA e ativar confiança em Ajustes → Geral → Sobre → Ajustes de Confiança de Certificado. Remover confiança após homologação. Não enviar a CA por serviço público; usar transferência local controlada. Os passos exatos do SO devem ser confirmados no aparelho.

## WSL com rede espelhada já existente

Se o WSL já possui o IP LAN privado (sem mudar sua configuração), executar no checkout isolado:

```bash
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve \
  --profile "$PAP_REVIEW_PROFILE" \
  --mobile-origin "https://$PAP_MOBILE_IP:34443" --bind "$PAP_MOBILE_IP" \
  --tls-cert .local/mobile-tls/cert.pem --tls-key .local/mobile-tls/key.pem
```

Permita somente entrada TCP34443 no perfil **Private**, origem **LocalSubnet**, para o IP especificado, se necessário e autorizado. Não abrir firewall global nem usar bind0.0.0.0.

## WSL2 NAT existente

Não mudar o modo da rede nem executar wsl --shutdown. Nesse caso `--bind` é o IPv4 eth0 privado do WSL, `--mobile-origin` usa o IP LAN do Windows e `--peer` é o gateway privado do WSL (`ip -4 route`, campo via). Isso permite somente o gateway explícito além da sub-rede própria.

```bash
export PAP_WSL_IP='172.28.10.20' # substituir
export PAP_WSL_GATEWAY='172.28.0.1' # substituir
./node_modules/.bin/tsx scripts/pap-id/review-lab.mts --action serve \
  --profile "$PAP_REVIEW_PROFILE" \
  --mobile-origin "https://$PAP_MOBILE_IP:34443" --bind "$PAP_WSL_IP" --peer "$PAP_WSL_GATEWAY" \
  --tls-cert .local/mobile-tls/cert.pem --tls-key .local/mobile-tls/key.pem
```

Preparação manual opcional no **PowerShell elevado**; primeiro inspecionar e parar se já houver regra/entrada nesse endereço e porta. Não substituir regras existentes:

```powershell
$PapLanIp = '192.168.1.50' # IP Windows
$PapWslIp = '172.28.10.20' # mesmo WSL acima
netsh interface portproxy show v4tov4
Get-NetFirewallRule -DisplayName 'PAP Beta1 Private 34443' -ErrorAction SilentlyContinue
# Somente se não houver entrada/regra conflitante e a rede for privada:
netsh interface portproxy add v4tov4 listenaddress=$PapLanIp listenport=34443 connectaddress=$PapWslIp connectport=34443
New-NetFirewallRule -DisplayName 'PAP Beta1 Private 34443' -Direction Inbound -Action Allow -Protocol TCP -LocalAddress $PapLanIp -LocalPort 34443 -RemoteAddress LocalSubnet -Profile Private
```

Não executar esses comandos no executor cloud ou na VPS. Mudança de IP do WSL exige parar a fixture, revisar **somente a entrada própria** e reiniciar; nunca sobrescrever outras portas. Se NAT expuser origem diferente do gateway previsto, acesso será negado: identificar o peer real localmente e revisar, sem aceitar cabeçalhos IP nem liberar qualquer origem.

## Parear e testar

1. Mesmo Wi-Fi privado; sem VPN/túnel público. Abrir `https://IP-LAN:34443/homologacao/parear` com certificado confiável.
2. O código aleatório aparece **apenas no terminal privado** do launcher. Digitar no formulário; não colocá-lo em URL, chat, log compartilhado ou screenshot.
3. Pareamento expira em60min; no máximo10dispositivos; cinco tentativas incorretas por origem/10min. Cookie HttpOnly/Secure/SameSiteStrict. Fechar/reiniciar o launcher revoga todos os acessos. Para um aparelho, abrir `/homologacao/acesso` → Encerrar acesso.
4. Autorizar consulta privada na interface. Usar apenas identidades/docs sintéticos. Ler dois QRs com câmera traseira, escolher explicitamente a gestante e confirmar CPF/RG de teste. QR sozinho não libera prontuário.
5. Testar permissão negada, concedida, pausa/retomada, troca de câmera disponível, voltar de background e fechamento. Câmera e tracks devem parar; PNG/código continua alternativa.
6. Verificar PDF original e upload privado, zoom, gesto/rolagem, downloads, abas e layouts. Não registrar frames/QRs em evidências.

## Encerrar somente os recursos deste acesso

Ctrl+C no launcher, logout dos aparelhos, remover CA do dispositivo. Em PowerShell elevado, apenas se essas entradas foram criadas por este roteiro:

```powershell
netsh interface portproxy delete v4tov4 listenaddress=$PapLanIp listenport=34443
Remove-NetFirewallRule -DisplayName 'PAP Beta1 Private 34443'
```

Não apagar volume/banco. A chave da CA e os certificados ficam privados até sua remoção controlada pelo operador. Não instalar CA em outros laboratórios. Se o certificado/pareamento for exposto, parar launcher imediatamente, gerar outra chave/CA e remover a confiança antiga.

## Limites da evidência

Testes cloud verificam protocolo HTTPS, certificado explicitamente confiado/pinado apenas para o teste, pareamento, origem e APIs; câmera usa stream sintético com QR real. Android/iPhone, webcam física, USB, conectividade Wi-Fi e encaminhamento WSL/Windows exigem homologação externa. Nenhum resultado simulado será declarado teste físico PASS.
