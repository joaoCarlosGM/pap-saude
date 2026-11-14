# Plano controlado do Codex — PAP-Protocols + PAP-ID (Beta 1)

**Data:** 14/11/2026  
**Status:** plano / autorização de execução incremental somente após conferência dos ativos; **não é ordem de deploy**.

## Fontes e branches

- Base comum: feature/admin-beta-isolated-deployment (0e0a2d816729cd68bebdc6c1a0339b2c8a19b861).
- Protocolos: feature/beta1-protocols-priority-nav. Documentos docs/protocolos/PAP-PROTOCOLS-BETA1-ESPECIFICACAO.md, VALIDACAO-E-PROXIMA-MISSAO.md e PROMPT-CODEX-PAP-PROTOCOLS-BETA1.md.
- PAP-ID: feature/pap-id-v1-registro-ux-spec. Documentos docs/design/pap-id-v1/README.md e 00 a 05.
- Referências de imagem esperadas (ainda **não** comprovadas por esta documentação): seis PNGs em docs/design/pap-id-v1/images/ e nove PNGs em docs/protocolos/referencias/.

**Gate G0: antes de codificar:** executar fetch remoto e verificar os 15 PNGs em seus branches; checar dimensões, conteúdo e status Git. Se ausentes, marcar BLOQUEADO e solicitar publicação, sem substituir por imagens inventadas. NÃO supor que estes dois ramos tenham sido integrados automaticamente; são irmãos.

## UI — regra obrigatória de Cursos e Chat IA

Na **Vitrine Premium**, a sidebar mostra **Cursos — Em breve** e **Chat IA — Em breve**, em texto e ícone, sem elementos <a>, sem href, sem onClick, sem tab stops artificiais e sem aparência de botão. A atual sidebar já segue este comportamento para clique pela navegação; validar em mobile e desktop. Também impedir exposição das telas demo antigas por acesso direto às URLs /vitrine/cursos e /vitrine/chat, com página simples de indisponibilidade ou redirecionamento seguro (conforme arquitetura de rotas), teste de navegação e retorno. NÃO confundir isso com segurança backend: manter bloqueios atuais de rotas e APIs operacionais, e não desativar o LMS real para unidades e usuários autorizados.

## Fases do trabalho

**Fase 1: Protocolos P1 — somente Vitrine sintética.**
Implementar a Biblioteca /vitrine/protocolos, filtros e cartões dos três documentos, detalhes genéricos com Visão geral, Fluxograma, Checklist e Documento original. Fluxogramas/checklists de conceito não são homologação clínica; conteúdo não revisado em estado "Em revisão". Remover CTA "Adicionar Protocolo" da Vitrine; autoria será exclusiva do futuro Admin. Sem upload, downloads artificiais, backend, migrations ou pacientes reais. Testar rota direta /vitrine/cursos e /vitrine/chat indisponíveis.

**Gate G1:** capturas e testes desktop/mobile, TypeScript, lint, e2e relevante e relatório PASS/FAIL/BLOCKED. Parar para homologação visual, antes de Fase 2.

**Fase 2: PAP-ID UX-S1/S2/S3 — somente Vitrine sintética.**
Usar exatamente a documentação existente do PAP-ID e as seis imagens de referência já confirmadas, reaproveitando o stepper de cinco etapas em Registro. Estados de QR fictício, documento validado, não encontrada, ações e resumo expandido com dados sintéticos. Nenhum QR com CPF/CNS ou dados clínicos embutidos, nenhuma consulta real de paciente, nenhuma alteração nas APIs de clínica ou PAP-Link nesta fase.

**Gate G2:** provas dos estados, responsividade, acessibilidade, tentativas inválidas simuladas, sem vazamento de estado, teste de regressão dos passos 2–5, sem deploy.

**Fase 3: protocolos PDFs reais** somente após direitos de uso, arquivos originais, hashes conferidos e autorização adicional. Visualizar/baixar PDF deve funcionar de fato, com permissão por sessão/contexto; sem arquivo não mostrar ação como funcional.

**Fase 4: backend PAP-ID e gestão/distribuição de protocolos** somente após desenho IAM, revisão clínica, backup verificado em clone e autorização explícita.

## Integração

- Não fazer merge direto em prod, PROD, develop ou branches de implantação.
- Após G1 e G2, preparar **branch de integração candidata** a partir da base comum, incorporar mudanças seletivas com revisão de diffs e testes; não force-push.
- Preservar todas as contas/MFA, banco local 15436, UI 3600 e VPS. Nenhuma migração/seed/reset em banco persistente.
- Não executar workflow manual de produção e não fazer SSH na VPS sem autorização separada.
- Toda evidência de teste deve ser executada, não prevista. Reportar SHA, arquivos alterados, links das imagens e estado dos gates.
