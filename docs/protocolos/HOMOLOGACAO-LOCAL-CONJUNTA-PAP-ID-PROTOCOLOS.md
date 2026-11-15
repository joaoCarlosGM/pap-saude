# Próxima homologação local — PAP-ID + PAP-Protocols

**Data:** 15/11/2026. **Estado:** plano de aceite, NÃO implementação concluída e NÃO autorização de deploy.

## Objetivo do operador

Na próxima rodada de homologação local, apresentar **na mesma execução**:
1. Cadastro e identificação de uma gestante **100% sintética** usando uma carteirinha PAP-ID de testes, emitida por comando no terminal WSL.
2. Fluxo de Registro: carteirinha/QR -> identificação -> validação demonstrativa -> resumo e escolha entre prontuário e novo atendimento, segundo docs/design/pap-id-v1.
3. Biblioteca de três protocolos com Visão geral, Fluxograma, Checklist e **PDF original** visualizável e baixável se autorizados, com conteúdo estruturado e provenance por página.

Não considerar a próxima homologação pronta se apenas as telas ou apenas os PDFs estiverem presentes.

## Pré-requisitos técnicos e separação

- Protocolos P1 está implementado em `feature/beta1-protocols-priority-nav`. Os PDFs foram publicados sob `docs/protocolos/documentos-originais/`; **conferir hash SHA-256 e direitos de distribuição antes de servir**. Conteúdo clínico de fluxogramas e checklists exige validação humana por responsável habilitado; caso não esteja aprovado, mostrar PDF original quando permitido e estruturar conteúdo com selo "em revisão".
- PAP-ID UX está especificado em `feature/pap-id-v1-registro-ux-spec/docs/design/pap-id-v1/` com seis PNGs. A implementação do fluxo e emissor/teste ainda devem ser realizados.
- Integrar por **branch candidata nova**, preservando os diffs; não fazer merge direto em prod, PROD, develop, nem implantar na VPS.
- Não usar registros reais, CPFs verdadeiros, CNS, nomes reais, QR contendo PII, secrets de produção nem banco local persistente 15436 nesta primeira homologação.
- O script de geração de carteirinha será estritamente de **teste** e deverá ser incapaz de produzir credenciais aceitas pela aplicação de produção. Nada de endpoints de desenvolvimento em produção.
- Uma demonstração inteiramente em memória pode testar o UX, mas não comprova persistência, autenticação, vínculos entre UBS ou segurança do PAP-ID operacional. Para validar cadastro real de teste, usar banco PostgreSQL **descartável e isolado**, com usuário/contas sintéticas, e provas de idempotência, revogação e anti-IDOR. Não conectar sem autorização ao banco existente.

## Requisito de CLI / carteirinha

Criar utilitário de desenvolvimento documentado, por exemplo:

```bash
npm run pap-id:demo -- --create-patient --issue-card
```

**Comando ilustrativo, NÃO existe até implementação.** A ferramenta deve:
- gerar paciente sintética e identificador aleatório único, sem CPF/CNS reais;
- criar token opaco aleatório, com identificador de ambiente de teste; em modo persistente, armazenar somente hash/token seguro e validade/revogação conforme arquitetura;
- emitir representação da carteirinha e QR testáveis localmente (arquivo local, nunca versionado), com mensagem clara "CARTÃO DE TESTE";
- exibir localização do arquivo e informações não sensíveis, não despejar token em logs de CI; fornecer mecanismo seguro para abrir/ler QR no navegador de teste;
- permitir cenários cartão válido, expirado, revogado e duplicado; sem efeito em produção.

Na UI, a leitura da carteirinha é distinta da autorização clínica. **QR + CPF/RG não autorizam, por si só, acesso a prontuário**. Qualquer exibição de dados clínicos requer vínculo institucional, sessão adequada, escopo e auditoria. No demo, usar mocks explicitamente sintéticos.

## Roteiro humano de aceite

1. Abrir terminal WSL em checkout de homologação isolado e confirmar `git status`, branch, Node e portas; iniciar fixture própria, sem tocar no serviço local 3600 sem consentimento.
2. Executar utilitário de geração e receber uma carteirinha fictícia verificável.
3. Abrir `/vitrine/registro` (ou endpoint de homologação especificamente autorizado), selecionar carteirinha, informar/ler identificador e concluir verificação demonstrativa; conferir passos do wizard preservados.
4. Validar estados: gestante encontrada, dados divergentes, gestante não encontrada, confirmação, resumo com informação sintética, prontuário/novo atendimento.
5. Repetir cartão: comprovar ausência de cadastro duplicado. Revogar/expirar token e verificar que acesso falha. Caso UX apenas em memória, registrar quais estados são simulados e não alegar backend validado.
6. Abrir `/vitrine/protocolos`; verificar biblioteca, três protocolos, filtros e quatro abas de cada um.
7. Conferir os documentos reais, checksum, visualizador e botão Baixar PDF **somente se direitos de distribuição e política do ambiente permitirem**. Se não, documentar como BLOCKED. Testar link/stream direto e permissões.
8. Validar que fluxogramas, checklists e resumos têm seção/página de origem e estado de revisão; nunca inferir que mockup gera conduta.
9. Testar Cursos e Chat IA: itens visíveis como texto "Em breve", sem links/handlers; acesso direto às rotas antigas não abre as telas.
10. Capturas desktop/mobile, regressão dos cinco passos, contraste, teclado, histórico, reload e relatório de testes realmente executados.

## Critério GO/NO-GO

- **GO apenas para homologação local conjunta** quando houver ferramenta de emissão PAP-ID de testes, fluxo integrável, três PDFs conferidos, interfaces completas, autorização de distribuição/documento ou bloqueio honesto, e isolamento demonstrado do ambiente.
- **NO-GO para produção** até validação de segurança, fluxos clínicos, autorização de uso, testes IAM/escopo, backups/restauração e aprovação explícita do operador.
- Nenhuma automação deve fazer deploy ou aguardar Codex em background. Codex executa etapas; após conclusão, operador traz relatório e autoriza próxima etapa.

## Entregáveis do Codex

1. Branch candidata de integração e SHAs exatos.
2. Comando `pap-id:demo` real, documentado e testado; exemplos de validação e revogação.
3. Integração funcional dos estados do PAP-ID e documentação do que é simulado versus persistente.
4. Leitor e download de PDFs condicionado à autorização, com verificação SHA-256 e conteúdo estruturado de origem.
5. Evidências de não alteração do 3600/15436, VPS/prod e contas existentes.
6. Relatório PASS/FAIL/BLOCKED e roteiro reproduzível para homologação local conjunta.
