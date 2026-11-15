# Beta1 final local — candidata para homologação privada

Branch `feature/beta1-final-local-acceptance-rc`, derivada de `00a4ebabaa38a896561aa91d00c1089412d76c73`. Código funcional validado em `dfb7331e2faf196d5c4dcdf4525f2cab5f773745`; o fechamento acrescenta testes de artefato e documentação, sem alteração funcional. SHA final deve ser conferido em `git rev-parse HEAD` e no resultado de publicação da entrega. Inventário e hashes: `evidence/source-manifest.json`; caminhos exatos: `INVENTARIO-FINAL.md`.

**Decisão:** candidata para homologação privada controlada; **NO-GO produção/publicação pública**. Aprovação visual humana, câmera física, confiança de certificados e LAN Windows/Android/iPhone continuam externas. Nenhum deploy, PR, merge, imagem GHCR ou alteração da VPS foi executado. A referência online foi comparada pelo SHA informado e capturas versionadas, sem inspeção da VPS ou do conteúdo servido ao vivo.

## Entregas reais

- Mesma experiência motion do commit0e0a2d8; comparação Git vazia para motion/shell/dashboard/premium e medição efetiva em navegador. Página/título260ms, KPI360ms e escalonamento65ms, gráfico850ms,23animações medidas; reduced-motion desativa. Perfil/menu, oito KPIs e estado compartilhado mantidos.
- Protocolos: cabeçalho/retorno, PDF autorizado real, avisos compactos, cards com ícones e temas citados, coluna lateral, grupos do checklist com progresso de leitura e expandir/recolher. Conteúdo clínico dos conceitos não foi usado como fonte. Originais preservados, hash/páginas conferidos. Fluxograma é a página original, com zoom/tela cheia/Escape, toque/rolagem e alternativa textual limitada. Não há prescrição, IA externa ou homologação assistencial.
- Câmera: solicitação explícita, prévia local, seleção de dispositivo disponível, preferência pela traseira, pausa/retomada, encerramento dos tracks ao fechar/background, hash para deduplicar, múltiplas candidatas e posterior confirmação por CPF/RG. PNG/código continuam disponíveis. Frames não são enviados nem armazenados. Teste usa stream sintético contendo QR real; não se confunde com teste físico.
- Cadastro: novas pessoas sintéticas persistidas além das três iniciais; nome e documento de teste restritos, consentimento, deduplicação e identidade de operação. A emissão imediata é opcional. UI e CLI usam o mesmo perfil PostgreSQL, com reemissão/revogação e histórico.
- Documentos: PNG recuperável cifrado, estado atual/histórico; PDFs por pessoa, categoria, upload/visualização/download reais, versão e arquivamento. SHA, tamanho, parser e controles de origem/escopo. Auditoria append-only da base privada. Não mistura anexos de paciente com originais institucionais.
- Persistência: extensão SQL privada aditiva v2, zero migrations Prisma. Restart do container próprio e nova instância da UI/HTTPS recuperaram pessoa, PNG e PDF idênticos; comparação integral das linhas antes/depois. Nenhum recurso foi recriado.
- HTTPS privado: ingresso em IP privado exato, pareamento temporário fora de URLs, cookie seguro, expiração/revogação, limite e métodos/rotas finitos. Backend somente loopback; não encaminha credenciais/IP fornecidos pelo cliente. Não é servidor de produção.

## Causas encontradas e correções verificadas

1. PDF.js funcionava isoladamente, mas o worker falhava dentro do Next. O adaptador privado usa caminho explícito da mesma versão instalada; upload/renderização real passaram.
2. Formulário HTTPS com `no-referrer` produziu `Origin: null` em Chromium. O ingresso usa `same-origin`: mantém Origin verificável sem enviar referência para outros sites. Não foi adicionada exceção para Origin null.
3. Next16.4 usa `/_next/hmr`; recusar esse caminho impedia hidratação. Liberados somente os dois caminhos HMR exatos, com sessão e origem exigidas. Sem liberação de prefixo genérico.
4. Saída de fullscreen por Escape precisava de tratamento explícito no visualizador, inclusive dentro de modal. Corrigida sem remover asserção; botão e Escape testados.
5. Dois testes tinham corrida de apresentação: sentinela é hidden por contrato e contagem antiga era colhida antes da hidratação do registro externo. Agora aguardam attached/serviço disponível; a igualdade de contagem permanece estrita.
6. O primeiro build usava dependências reaproveitadas por symlink; seu standalone apontava para fora do artefato. Isso invalidava a conclusão de portabilidade do smoke inicial. Materializadas as mesmas dependências, sem npm install, troca de versões ou lockfile; build refeito. Gate agora rejeita links externos. Novo standalone e imagem local funcionaram isoladamente.

## Validação

Resultados efetivamente observados, comandos e hashes dos logs constam em `evidence/validation.json` e `private-log-manifest.json`. Logs completos ficam privados em `.local/final-local`; cópias públicas contêm resultados sanitizados.

| Gate | Resultado |
|---|---|
| Node PAP-ID/Protocolos/Premium | PASS107/107 |
| Unidades auth/MFA/RSC/ingresso | PASS24/24 (inclui edge3) |
| Registro v2/PDF/adversariais | PASS2/2 |
| PostgreSQL: emissão concorrente, retry, origem, guard de recursos | PASS4/4 |
| Restart integral próprio | PASS1/1; linhas e hashes preservados |
| Sessão privada expirada | PASS1/1; PDFs/cards/anexos negados e renovação silenciosa recusada |
| HTTPS completo em Chromium + CA explícita/pin | PASS;1jornada, sem erro JS inesperado |
| Browser integrado final | PASS22/22 na mesma execução final, em série e zero retries (3min) |
| Matriz visual dirigida | PASS; sete larguras, dois temas, teclado/axe, fullscreen e reais downloads |
| TypeScript | PASS; também executado pelo build real |
| Lint integral | PASS,0erros e4avisos herdados em testes clínicos não modificados |
| Build Next webpack portátil | PASS; fontes locais, sem dependência de Google Fonts |
| Standalone HTTP/RSC/segredos/portabilidade | PASS; privados404 e Vitrine sem sessão → login |
| Docker runtime empacotado do standalone | PASS; base pinada, nonroot/read-only,3939arquivos, sem dados privados, não publicado |
| npm produção |0HIGH/0CRITICAL,10MODERATE |
| npm completo |14HIGH/24MODERATE/1LOW,0CRITICAL; riscos herdados explícitos |
| CI remoto integral | NOT RUN; branch não está nas allowlists. Workflow e permissões não foram alterados |
| Dockerfile multistage canônico/migrator/Trivy | NOT RUN nesta missão; teste de imagem runtime não substitui esses gates para publicação |
| F03/F04/Beta operacional completos | NOT RUN novamente; fontes protegidas/36migrations intactas, não são PASS históricos transferidos |
| Webcam/USB/Android/iPhone/Windows LAN físicos | NOT RUN externo |
| Revisão clínica/direitos públicos dos PDFs | BLOCKED por validação/autorização institucional |

Comandos centrais executados no checkout isolado:

```bash
node --import ./tests/protocols/load.mjs --test tests/pap-id/*.test.mjs tests/protocols/*.test.mjs tests/vitrine-premium/*.test.mjs
./node_modules/.bin/tsx --test tests/pap-id/mobile-edge.test.mts tests/auth/crypto-core.test.ts tests/auth/mfa-secret-encryption.test.ts tests/commercial-beta/rsc-metadata.test.ts
./node_modules/.bin/tsx --test tests/pap-id/final-registry.test.mts
./node_modules/.bin/tsx --test tests/pap-id/database.test.mts
./node_modules/.bin/tsx --test tests/pap-id/restart.test.mts
./node_modules/.bin/tsx --test tests/pap-id/private-session.test.mts
./node_modules/.bin/tsx tests/pap-id/mobile-runtime.mts
node tests/protocols/run-browser.mjs --integrated
./node_modules/.bin/tsc --noEmit
npm run lint
npm run build -- --webpack
node tests/pap-id/production-boundary.mjs
python3 tests/pap-id/docker-runtime-boundary.py
npm audit --omit=dev --audit-level=high --json
npm audit --audit-level=high --json
git diff --check
```

Os comandos DB/browser receberam PAP_ID_REVIEW_PROFILE apontando apenas ao recurso próprio com labels provadas. Build/runtime receberam DATABASE_URL dummy em127.0.0.1:1 e e-mail desativado. O teste HTTPS confia somente na CA/certificado gerado para aquela execução; não desativa TLS globalmente. Nenhuma suíte compartilhou DB com outra concorrente.

## Preservação e artefatos

`protected-boundaries.json` comprova igualdade de código com a base para src/server, src/app, src/components/premium, proxy, Prisma/36migrations, deploy, workflows, Dockerfile, ignore e lockfiles. Nenhum acesso a3600/15436, contas existentes, senhas, MFA, sessões, volumes do operador, VPS, Nginx ou dados reais. O próprio cache de um build anterior do executor foi transferido intacto para/tmp com hashes verificados e symlink no caminho original, para limitar espaço de Docker; código/runtime desse checkout anterior não foram alterados. Não foi feita limpeza global.

Arquivos privados permanecem em.local: profile, chave AES, senha do DB, TLS/CA, código de pareamento, carteirinhas emitidas, PDFs de teste e logs brutos. Os screenshots publicados têm QR/vídeo/canvas institucional mascarados. Os originais PDF versionados previamente não foram modificados nem copiados ao runtime. O teste Docker cria e remove somente containers/imagem próprios, confirmando label; não toca no PostgreSQL do operador nem publica imagem.

## Homologação e limites

Seguir `HOMOLOGACAO-WSL.md`, `HOMOLOGACAO-MOBILE.md` e os três checklists. Novo checkout e novo perfil; nenhuma atualização do laboratório3600 é necessária ou autorizada. Não recadastrar contas nem MFA. Para retomar o perfil criado, usar start/serve, nunca create/reset.

**GO limitado à avaliação privada dos recursos sintéticos testados. NO-GO para produção, uso assistencial ou publicação pública de PDFs.** Hardware, rede real, validação clínica, direitos de distribuição, CI/scanners completos e plano de implantação revisado são pré-condições externas. `CHECKLIST-DEPLOY-FUTURO.md` prepara a revisão; nenhuma ação remota foi executada. Parar após esta entrega.
