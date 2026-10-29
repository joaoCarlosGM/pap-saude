# Tutorial reutilizável — integração P0 futura, NÃO autorizada nesta fase

O componente `src/components/onboarding/GuidedTour.tsx`, o posicionamento/filtro puro em `src/lib/onboarding/tour.ts` e os tipos em `src/types/tour.ts` não importam fixtures, perfis, cookies, sessões, pacientes, IAM ou mensagens de demonstração. O texto e a navegação são fornecidos pelo host; o componente não chama APIs nem concede permissões. A Vitrine usa `DemoOnboarding` e seu roteiro separado em `src/lib/demo/tour.ts`.

## Contrato de integração

1. Montar o tutorial **após autenticação, MFA real e primeiro acesso concluído**, sem reabrir inscrição/MFA ou alterar os guards existentes.
2. O servidor determina rotas e capacidades autorizadas para a sessão, município e UBS atuais. Não derivar autorização apenas do nome do papel nem confiar em listas editáveis do cliente.
3. `authorizedTourSteps` filtra apresentação quando `securityReady` é verdadeiro e cada rota/capacidade foi permitida pelo host. Esse helper **não substitui IAM, guard de rota, CSRF ou autorização de APIs**. Acesso direto e concorrência/revogação continuam sob os controles P0.
4. A navegação entre etapas é um callback do host. Revalidar destino, guard e escopo; remover etapas não autorizadas após revogação. Não abrir dados de prontuários como exemplo sem autorização.
5. Identificar elementos reais com atributos `data-tour` ou seletores estáveis. Só destacar componentes já disponíveis; nunca renderizar um botão proibido para completar o roteiro.
6. Manter o provider/estado de domínio fora do elemento animado por rota. O tutorial não deve apagar rascunhos, pacientes nem estado clínico.
7. Apresentação sugerida após MFA: **Conheça seu espaço de trabalho**, com **Iniciar tutorial** e **Agora não**. Reabrir pela Ajuda. Não exibir mensagem de dados fictícios no ambiente clínico real.
8. Preferência de primeiro acesso operacional, armazenamento persistente e adaptação às APIs/IAM dependem de uma nova missão. Não reutilizar a flag de sessão da Vitrine como política de onboarding operacional.
9. Nenhuma alteração no P0 foi executada nesta fase. Integração seletiva deve ocorrer em branch própria e exige CI completo e homologação da porta 3200; não fazer merge de prod no P0.

## Roteiro PROFESSIONAL (filtrado pelo escopo efetivo)

| Etapa | Elemento real | Condição |
|---|---|---|
| 1 | Perfil, município e UBS | Vínculo institucional autorizado; evitar exibir instituições fora do escopo |
| 2 | Dashboard operacional | Somente indicadores reais e autorizados; nenhum mock |
| 3 | Pesquisa e consulta de pacientes | Permissão clínica da UBS; nenhum acesso implícito por papel global |
| 4 | Registro e Atendimentos | Criação/leitura conforme concessões; não abrir um prontuário para ensinar sem autorização |
| 5 | Protocolos, Ferramentas, Chat IA e Configurações | Somente módulos efetivamente disponíveis; informar indisponibilidades reais |

## Roteiro administrativo

| Papel | Conteúdo possível, sempre condicionado ao IAM real |
|---|---|
| PAP_ADMIN | Administração institucional, pendências, convites, ativação e auditoria autorizadas; sem acesso clínico implícito |
| PAP_MANAGER | Governança estritamente delegada, convites/decisões permitidos; sem nomeação de gerente/admin ou ativação de UBS |
| MUNICIPAL_ADMIN | Município autorizado e suas ações permitidas; sem alcançar outros municípios/global |
| HEALTH_UNIT_ADMIN | Sua UBS e profissionais autorizados; sem ações institucionais exclusivas globais |

Não se concede nenhuma dessas capacidades neste componente. O mapa exato dos nomes de permissão e rotas deve ser obtido do catálogo P0 vigente na fase de integração, em vez de inventar ou duplicar regras nesta branch demonstrativa.

## Homologação futura necessária

- MFA pendente/ausente, sessão expirada/revogada: não montar o tutorial operacional.
- Profissional de UBS A não recebe etapa, seletor ou dado da UBS B.
- Admin/gerente sem concessão clínica não recebem atalhos para prontuários.
- Revogação e mudança de escopo durante o tour removem etapas e negam APIs/rotas no backend.
- Teclado, leitor de tela, resize e movimento reduzido preservados.
- Rascunhos não perdidos ao avançar/pular/reabrir.
- O motor `src/lib/demo/meows.ts` **não integra** automaticamente este pacote reutilizável. Uso assistencial depende de homologação clínica institucional e autorização específica.

Fases 2 e 3 permanecem proibidas até aprovação manual: não integrar ao P0, abrir/atualizar PR para prod, fazer merge ou deploy nesta missão.
