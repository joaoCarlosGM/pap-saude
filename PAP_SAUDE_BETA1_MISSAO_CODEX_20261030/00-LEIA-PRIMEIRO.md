# PAP Saúde Beta 1 — pacote de execução para Codex

**Data de especificação:** 30/10/2026  
**Projeto:** `joaoCarlosGM/pap-saude`  
**Branch de trabalho autorizada:** `feature/p0-premium-unified-rc`  
**HEAD verificado antes de gerar o pacote:** `d247020dfa84b7cdb70a8cb8ac2665f18a153ae8` (comparar novamente com o remoto antes de escrever).  
**Laboratório HOMOLOGAÇÃO DO OPERADOR:** `~/projetos/pap-saude-p0-unified-rc`, `127.0.0.1:3600`, PostgreSQL `127.0.0.1:15436`, DB `pap_p0_unified_rc`, volume `pap-p0-unified-rc-data`, container `pap-p0-unified-rc-db`.

## A decisão do proprietário, que prevalece sobre desenhos ilustrativos

1. **Preservar sem reset** o banco local 3600, as **sete contas existentes**, senhas, vínculos, autenticação multifator (MFA), sessões, chaves privadas, histórico clínico sintético e configurações. O operador já cadastrou MFA; não forçá-lo a recadastrar por mudança de UI. Não sobrescrever `.local`, cookies, variáveis, container ou volume.
2. **Preservar exatamente os KPIs/gráficos/semântica existentes** no Dashboard. Nenhum novo KPI, percentual, risco clínico, dado falso ou alteração de cálculos/SQL é autorizado por mockup. A capa visual do Dashboard é a única mudança de apresentação prevista no conteúdo desse Dashboard.
3. **Vitrine e operação compartilham a mesma linguagem e os mesmos componentes visuais**, mas NÃO os mesmos dados nem permissões. `/vitrine/*` continua exclusivamente fictícia e isolada. Clínica operacional: dados reais por UBS ou estado vazio explícito. Não importar `DemoProvider` para operação.
4. **Banners em TODAS as rotas da sidebar, sem personagens/fotos humanas** (inclusive Admin/MANAGER). Fotos ilustrativas de PERFIL são permitidas na Vitrine; operacional usa foto autorizada do próprio usuário ou iniciais. Os mockups que contêm pessoas em banners são **referências de estrutura, NÃO autorização para usar essas figuras**.
5. **Sidebar:** primeiro Dashboard; em seguida Clínica (Registro, Atendimentos, Pacientes); Conhecimento e apoio (Protocolos, Ferramentas, Chat IA, Cursos); Sistema (Avisos, Configurações); cartão “Precisa de ajuda?” no rodapé. Item ativo sem barra vertical; usar somente fundo e texto/ícone. Curso novo: distintivo somente para novidade existente.
6. **PAP_ADMIN GLOBAL:** design verde-petróleo light/dark, administração completa preservada, navegação município → UBS/hospital → equipe/responsáveis/perfis. Apresentação premium não concede permissões.
7. **PAP_MANAGER:** bancada de inclusão e gestão (municípios, solicitações de UBS, cadastro/convite Comercial se autorizado, vitrine se tiver grant, autoria/edição/publicação e distribuição institucional de cursos). **Sem dashboard de métricas**. Não ativa UBS; não apaga UBS; não nomeia administradores sem grant.
8. **HEALTH_UNIT_ADMIN:** **mesma interface clínica do profissional**, acrescida de ações autorizadas para atribuir cursos liberados à sua UBS/hospital, a todos ou a profissionais selecionados; definir obrigatoriedade/prazo e acompanhar equipe. Não edita conteúdo dos cursos. Acesso clínico apenas com grants clínicos efetivos; papel não implica permissão clínica automática.
9. **PROFESSIONAL:** vê cursos atribuídos, inicia conteúdo interativo HTML5 em rota de aprendizagem própria, persiste progresso no PostgreSQL, conclui avaliações conforme regras. Sem API de autoria, publicação ou distribuição.
10. **MUNICIPAL_ADMIN:** no seu escopo municipal, vê cursos oferecidos às suas unidades e acompanha sua distribuição; ações de encaminhamento a UBS exigem grant específico e não substituem decisão de atribuição pelo HEALTH_UNIT_ADMIN. Não amplia escopo de outro município.
11. **Cursos:** thumbnail, categorias, obrigatório/recomendado/opcional, progresso, prazo de conclusão, validade de certificado SE houver certificação validada, status e CTA contextual. Vitrine fictícia preenchida; operação vazia ou persistente com dados reais. Não usar imagem demonstrativa como certificado real.
12. **Suporte:** ajuda = tutorial guiado existente adaptado às permissões + fluxo verdadeiro de abertura de chamado de TI, se o serviço implementado. Não mostrar “chamado enviado” se não houver persistência.
13. **Acesso e clínica:** preservar CAPTCHA, MFA, IAM, anti-IDOR, isolamento tenant, auditoria, mecanismos de registro idempotente, MEOWS `DRAFT_UNVALIDATED` e fluxos de e-mails. Nenhum efeito assistencial dos scores demo.
14. **NÃO acessar VPS, NÃO fazer merge/push em `prod`, `PROD`, `develop` ou `TEST`, NÃO alterar DNS/Resend, NÃO executar Docker prune, reset, remover volumes, ou sobrescrever checkouts antigos.** Deploy VPS somente em missão posterior com autorização expressa.

## O que há neste pacote

- `docs/`: requisitos executáveis, arquitetura, estados, rotas, RBAC, banco, LMS, segurança, testes, CI, backup, critérios de aceite.
- `referencias/`: mockups e capturas aprovadas, rotuladas como **referência**, nunca como evidência de implementação.
- `assets/banners/`: **10 artes SVG originais sem pessoas** com temas para protótipos e eventual uso após revisão visual.
- `assets/thumbnails/`: arte vetorial básica por categoria de curso (substituível por arte licenciada).
- `scripts/`: preflight somente leitura; não modifica o laboratório.
- `PROMPT-PARA-CODEX.md`: missão integral, pronta para colar.

**Não contém senha, token, QR de MFA, screenshot com credenciais, `.env`, chave de sessão nem dados clínicos pessoais.** Não copiar a captura de credenciais exibida em conversa para documentação/commit. Contas existentes são propriedade do laboratório, NÃO fixtures a serem recriadas.

## Ordem de leitura para economizar contexto

1. `PROMPT-PARA-CODEX.md` + este arquivo; 2. `docs/01-UX-ROTAS.md`; 3. `docs/02-ROLES-FLUXOS.md`; 4. `docs/03-LMS-ARQUITETURA.md`; 5. `docs/04-PRESERVACAO-LOCAL.md`; 6. `docs/05-SEGURANCA-TESTES.md`; 7. `docs/06-ACEITE-RELEASE.md`; 8. `referencias/MANIFESTO.md` e imagens conforme módulo.

## Atenção a conflitos

O **código atual** ainda expõe `/cursos` operacional como `ClinicalModuleNotice`; o módulo LMS real é **nova funcionalidade** e exigirá migrations adicionais. Tratar isso como desenvolvimento real, não como alteração cosmética. A operação clínica e a Vitrine NÃO podem ser tornadas idênticas em conteúdo: somente em linguagem visual e componentes compartilháveis.