# Ajuda, notificações de cursos, suporte, estados vazios e ciclos de vencimento

## Cartão “Precisa de ajuda?”

Local fixo: parte inferior da sidebar em todas as variantes (Vitrine, Clínica/UNIT_ADMIN, Admin Global e Manager). Rosa no clínico, verde-petróleo no Admin. Foto do perfil fica no topo, Help no rodapé (não misturar as duas coisas).

Ao abrir, oferecer dois botões: `Iniciar tutorial guiado` e `Solicitar suporte de TI`.

### Tutorial

- Reutilizar o tour Vitrine e os componentes `GuidedTourEngine`/`ClinicalTour` existentes; registrar versão de tour por usuário **SEM tocar MFA**, permissões e outros onboardings de segurança.
- Alvos condicionados às rotas visíveis e às permissões efetivas. Se não há elemento/permission, pular etapa em vez de apontar fora da tela.
- Vitrine simula tutorial. Operação mostra funcionalidades reais. Teclado Esc, Próximo, Voltar, Fechar, foco, reduced-motion.
- Tutorial do player LMS apresenta navegação por aulas, verificação de progresso e saída segura; não libera etapas nem completa aula artificialmente.

### Suporte TI

- UX: categoria (Login/Perfil/Curso/Atendimento/Outro), assunto, resumo, descrição, prioridade sugerida, botão `Enviar solicitação`, protocolo retornado e status (`Aberto/Em atendimento/Resolvido`).
- Chamar API/service real com auth e audit, ou, se o domínio de chamados ainda não estiver implementado, bloquear CTA com descrição honesta `Integração de suporte em preparação` até completar o backend. Nunca reportar enviado sem persistência.
- Captura de tela/upload opcional somente com sanitização, consentimento e aviso para não incluir prontuários/PHI.
- Gerar chamado não dá acesso à conta nem a dados clínicos ao suporte por padrão.

## Notificações de Cursos

Eventos: `COURSE_RELEASED_TO_UNIT`, `COURSE_ASSIGNED_TO_USER`, `COURSE_DEADLINE_APPROACHING`, `COURSE_OVERDUE`, `COURSE_COMPLETED`, `COURSE_RENEWAL_DUE` somente quando houver data real.

- Evitar e-mail externo no perfil local: integrar notificações à inbox persistente atual. Não habilitar Resend na porta 3600.
- Badge `Novo` no menu de Cursos somente se lançamento/atribuição recente não vista por aquele usuário e permitida pelo escopo. Pode conter número de novos cursos; quantidade vem do DB, nunca hardcoded.
- Exibição no profissional: `Curso obrigatório atribuído — conclua até DD/MM/AAAA`; data atribuída pelo gestor.
- Exibição no Unit Admin: `Curso disponibilizado pela PAP — atribua à equipe`; depois listagem de equipes e pendências.
- Notificações duplicadas: unique event/user/assignment ou idempotency key, não enviar 42 mensagens em cada refresh.

## Prazos: duas semânticas independentes

1. **deadlineAt**: data/hora-limite da atribuição para CONCLUIR curso. Status atrasado a partir de deadline, com precisão consistente e fuso comunicado. Expirar não apaga a matrícula, não impede revisão e não cancela validação final sem regra institucional explícita.
2. **validUntil**: validade do CERTIFICADO após conclusão e aprovação, se política formal de certificação implantada. Renovação/reciclagem deve criar novo ciclo ou matrícula; não reescrever histórico de conclusão.

Urgência visual: >30 dias informativo, 8–30 dias alerta discreto, 0–7 dias alerta prioritário, vencido forte com texto, concluído com data e etiqueta; não depender só de cor. Como os mockups têm datas fictícias, curso real calcula tudo a partir do backend.

## Estrutura do Catálogo

- Banner temático sem personagens em `/cursos`.
- Pesquisa nome/categoria/descrição, filtro tema, status, obrigatoriedade, prazo, classificação `Meus cursos`/`Novos`/`Obrigatórios`/`Concluídos`.
- Card 16:9 com thumbnail, categoria, badge obrigatório, duração, aulas, progresso, prazo e CTA. 3 colunas desktop, 2 tablet, 1 mobile.
- Unidade Admin: mesmo catálogo; abas extras `Liberados à unidade`, `Enviados`, `Pendências`, `Concluídos`; `Atribuir à equipe` abre drawer com ALL/SOME, contagem real e confirmação.
- Manager: outro workspace teal de AUTORIA, não atribui a profissionais: edita curso e libera a municípios/UBS.
- Vitrine tem seis cursos sintéticos e estágios fictícios; não sincroniza com o PostgreSQL real. Sem tag `certificado válido` que possa ser confundida com credencial efetiva.
- Real sem cursos: `Nenhum curso atribuído no momento. Quando sua unidade disponibilizar capacitações, elas aparecerão aqui.` Sem inventar 6 cursos para preencher grade.
