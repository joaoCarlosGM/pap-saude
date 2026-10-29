# PAP Saúde P0 Premium unificado — arquitetura

Base autorizada: b8e900c2ca6f4b17375cc1fbe0ec397af0383a2a. Branch: feature/p0-premium-unified-rc.

A aplicação operacional usa componentes de apresentação em `src/components/premium`: tokens, movimentos, contadores acessíveis, indicador do menu, diálogo nativo e alternância de áreas. Esses componentes não importam Vitrine, fixtures, Prisma ou serviços clínicos. O valor semântico final das métricas fica disponível durante toda a animação; ausência/supressão/composições não viram zero. Navegação é nativa do Next, sem interceptador global ou temporizador.

| Área | Fonte real / fronteira |
|---|---|
| Login, recuperação e MFA | Contratos AUTH existentes, CAPTCHA, primeiro acesso e MFA operacional preservados |
| Clínica | `requireClinicalPageSession` + perfil efetivo; APIs verificam sessão, MFA, grants e UBS |
| Dashboard | `clinicalDashboard` em transação RepeatableRead; quatro KPIs, seis meses UTC, indivíduos distintos e vínculos ativos |
| Registro | Wizard existente e operações transacionais/idempotentes; recuperação por chave durável sem guardar prontuário no navegador |
| Pacientes / ficha | Serviços e APIs reais; cartões abrem somente prontuário autorizado; nenhuma vacina/documento inventado |
| Atendimentos | Listagem real, filtro, detalhes e transições autorizadas pelas APIs existentes; encerrados não recebem botões de edição |
| Administração | `firstAccessState`, MFA e `getEffectiveAccessProfile`; AdminShell, menus completos e tour existente preservados |
| Métricas Admin | Serviço Beta/governança; período, denominadores, supressão e ausência continuam explícitos |
| Notificações | Inbox e contagem persistentes existentes; nenhum contador fictício |
| Comercial | Guard comercial original; link ao início da conta passa pelo resolvedor de destino autenticado |
| Vitrine | Namespace `/vitrine`, guard comercial e estado sintético independentes, sem chamadas clínicas |

## Papéis e rotas

| Perfil efetivo | Destino / restrições |
|---|---|
| PAP_ADMIN | Admin; não recebe acesso clínico implícito |
| PAP_MANAGER | Governança delegada; não ativa UBS, não nomeia gerente/Admin nem lê prontuários por `organization.read` |
| MUNICIPAL_ADMIN | Admin dentro do município autorizado |
| HEALTH_UNIT_ADMIN | Admin dentro da UBS autorizada; clínica somente com grants clínicos efetivos |
| PROFESSIONAL | Clínica das UBS autorizadas com MFA; sem poderes administrativos implícitos |
| COMMERCIAL | Comercial e Vitrine; não acessa clínica/Admin sem concessão independente legítima |
| Combinação de grants | Links entre áreas derivados do perfil efetivo; cada destino revalida no servidor |
| Sem MFA / sem concessão | Não opera páginas/APIs privilegiadas; configuração inicial e recuperação mantidas |

A identidade e os nomes institucionais da sidebar vêm do perfil efetivo do servidor. Não são os dados de Ana Paula/Belém/UBS Demonstrativa. O contexto não constitui concessão de privilégio. Backend e banco permanecem autoritativos mesmo diante de alteração do menu/client state.

## Limites assistenciais

MEOWS operacional permanece DRAFT_UNVALIDATED/POLICY_UNRESOLVED: sem score, classificação automática, alertas ou condutas geradas. O motor demonstrativo não foi importado para a clínica. Chat IA, Cursos, Ferramentas e Protocolos operacionais mantêm seus avisos de indisponibilidade; não foram criados serviços clínicos fictícios.

O tour clínico usa `GuidedTourEngine`, alvos operacionais e permissões efetivas; ajuda reinicia somente progresso de tutorial. Não altera onboarding de MFA, concessões ou registros clínicos. Os guards permanecem obrigatórios independentemente do estado de apresentação.

## Fontes e build

Inter, Geist e Geist Mono auto-hospedadas por `next/font/local`; mesmas famílias, sem download de fontes no build/runtime. Fontsource-variable5.3.0, SIL OFL1.1. Licenças e proveniência/integridade em `src/app/fonts/`. Nenhuma dependência foi atualizada para mascarar o problema de rede.

## Correções comprovadas durante a integração

A camada de apresentação não altera a regra de integridade clínica. O teste de produção encontrou dois defeitos de transporte: exceções baseadas em new.target.name não preservavam nomes sob minificação; os erros de medição EncounterNotEditable não tinham mapeamento HTTP. Os nomes públicos foram estabilizados e somente os dois conflitos conhecidos de sinais vitais/obstetrícia passaram a HTTP409. Os locks e serviços de escrita permanecem idênticos; as tentativas negadas não alteram medições nem proveniência.

A hipótese de que a minificação causava especificamente o 500 da medição foi corrigida: era um defeito adicional; o mapeamento ausente de NotEditable era a causa direta desse 500.

O tracing standalone originalmente copiava a configuração privada local ao seguir caminhos dinâmicos. Foram restringidos os caminhos a .local, antecipada a recusa de captura de e-mail em produção e excluídos arquivos privados do tracing. Um teste examina o artefato efetivo. As cópias geradas foram removidas/reconstruídas; os arquivos privados originais foram preservados. Nenhum artefato vulnerável foi publicado.
