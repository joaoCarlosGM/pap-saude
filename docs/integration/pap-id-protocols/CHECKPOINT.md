# Candidata PAP-ID + Protocolos — checkpoint

Base remota: ed474092a6e60794ac65077ffc37852685aaa588.
Branch: feature/beta1-pap-id-protocols-integrated-rc.
Porte seletivo: documentação/imagens PAP-ID de ae2a5b941a3cb69fd67da1cd0c2648074c55cb27.
Nenhum merge de código de branches irmãs. Checkout de Protocolos e demais worktrees preservados.

- [x] AGENTS, missão, documentação técnica e referências visuais conferidos.
- [x] PDFs originais presentes; SHA-256 e 25/34/36 páginas conferidos.
- [ ] Emissor CLI sintético: PNG QR, ledger hash-only, expiração/revogação e deduplicação.
- [ ] Estados PAP-ID na etapa1; Registro permanece com cinco etapas.
- [ ] Leitor real reutilizável e download dos mesmos bytes; fonte por seção/página/versão.
- [ ] Fixture conjunta loopback com consentimento/sessão local privada; produção sem endpoints.
- [ ] Testes Node/browser/QR/PDF e regressões P1/Registro, TypeScript, lint, build real.
- [ ] Evidências, inventário, parecer e instruções locais; parar para homologação humana.

Direitos de redistribuição pública: BLOCKED. Nenhuma publicação pública de PDFs autorizada.
PDFs somente na fixture privada, com escopo por processo, verificação de origem e cookie HttpOnly.
Nenhuma alteração em APIs clínicas, IAM/MFA, banco/Prisma, Nginx ou workflows de deploy.
CLI/ledger e conferência da identidade são demonstração; não provam PAP-ID/PAP-Link operacional.
Bibliotecas existentes reutilizadas. PDF.js6.5.438 acrescentado apenas para renderização local
real (sem CDN, scripts/anotações do PDF ou serviços externos); lockfile será auditado.
