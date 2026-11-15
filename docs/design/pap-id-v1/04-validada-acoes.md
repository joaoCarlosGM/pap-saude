# Identidade confirmada: escolher prontuário ou novo atendimento

**Imagem:** `images/04-validada-acoes.png` (arquivo original: `gestante_validada_com_sucesso.png`). **Categoria:** conceito/referência, não UI implementada. **Passo:** 1/5.

### Objetivo
Oferecer duas trajetórias explícitas após a **verificação documental e as permissões institucionais**: consultar prontuário ou iniciar atendimento. Não misturar escolha de navegação com concessão de acesso.

### Estrutura
- H2 «Gestante validada com sucesso», descrição breve; Stepper permanece 1.
- Cartão rosa-claro compacto com nome, data nascimento, CNS (mascarado se necessário), instituição de origem (se autorizada) e selo verde «Identidade validada» baseado em resposta do servidor.
- Subtítulo «Escolha a próxima ação».
- Dois cartões de escolha simétricos: (a) «Acessar prontuário» com ícone pasta e botão contornado rosa; (b) «Realizar novo atendimento» com ícone medical e botão preenchido rosa.
- Faixa informativa de fundo lilás sobre contexto de UBS e registros.
- Rodapé «Voltar» e ação principal consistente. Evitar **duplo CTA contraditório**: a arte mostra botões nos cartões e «Continuar»; implementação escolher um padrão: cartões selecionáveis + «Continuar» **ou** botões de ação diretos, nunca ambos ambíguos.

### Autorização
`Acessar prontuário` só habilitado depois de comprovar escopo de leitura; `Novo atendimento` exige UBS executante selecionada e confirmação de responsabilidade. Se paciente ainda não vinculada, interpor fluxo PAP-Link antes da navegação. Não revelar dados de outra UBS sem escopo de compartilhamento aprovado. Tela e ações não conferem permissões por si.

### Estados/testes
`validated | requires_link | link_pending | authorized | denied | stale_context`. Testar revogação de papel, alteração da UBS entre telas, acesso direto por URL, duplicação de atendimentos, retorno e timeout.

## Contrato visual obrigatório

- Referência primária: Vitrine Premium oficial, componentes `src/features/vitrine-premium/components/registro/{RegistrationWizard,Stepper}.tsx` e `steps/IdentificationStep.tsx`. Preservar cabeçalho Registro / Iniciar novo atendimento, composição centralizada, cinco etapas e aparência dos componentes existentes. Não redesenhar sidebar.
- Etapas invariáveis: **1 Identificação → 2 Gestação → 3 Sinais Vitais → 4 Dados Obstétricos → 5 Resultado**. Todos os estados de QR pertencem **à etapa 1**; não inserir uma sexta etapa.
- Base cromática de referência: fundo branco `#FFFFFF`, tinta primária `#0F172A`, secundária `#64748B`, bordas `#E2E8F0`, rosa de ação `#FF2876`/família `pink-500` existente, cinza de etapa `#F1F5F9`, verde de êxito `#15803D` sobre `#DCFCE7`, rosa muito claro `#FFF1F6`, roxo informativo muito claro `#F5EFFD`. **Valores estimados a partir das imagens e do Tailwind; inspecionar tokens/componentes reais antes de codificar**. Não inventar uma nova paleta azul/roxa.
- Geometria: viewport de referência desktop; cabeçalho horizontal discreto; cartão do wizard centralizado `max-w-5xl` existente, cantos amplos (`rounded-xl/2xl`), contorno cinza de baixo contraste, sombra delicada; espaçamento interior `p-4 sm:p-6 lg:p-8`, ritmo vertical de 16–32px, botões altos ~44–48px e rodapé com divisor fino.
- Tipografia: fonte existente da aplicação; título da seção ~20–24px semibold, subtítulo ~14px cinza, rótulos ~14px medium, valores clínicos ~14–16px semibold, microcópia ~12–13px. Priorizar hierarquia sem texto microscópico.
- Ícones: `lucide-react`, traço regular ~1.75–2px, tamanhos 16–24px, nunca emojis; ícones decorativos com `aria-hidden`.
- Responsividade: em celular, cartões empilhados, campos e botões de largura total, Stepper móvel já existente, foco visível; evitar overflow horizontal. Área clicável >=44x44px; contraste AA; mensagens `role=status/alert`.
- Imagens de conceito são **referências visuais, não fontes de verdade para fluxos clínicos**. CPF/CNS/RG/nomes/UBS/datas esboçados são fictícios. Não copiar dados inventados como fixtures de produção.
- Privacidade: QR **não contém CNS/CPF/dados clínicos**. Leitura, validação documental e vínculo institucional são verificações distintas; não divulgar dados pessoais completos antes de autorização. Sem acesso ao prontuário nem criação automática de vínculo com a mera leitura. A declaração de vontade da gestante não substitui a base legal aplicável.
- Na **Vitrine Comercial**, tudo é sintético e em memória, sem câmera em produção real, APIs clínicas, pacientes reais ou consultas DATASUS. Na **aplicação operacional**, usar autenticação, MFA, IAM por UBS, idempotência, auditoria e dados do banco. O exemplo visual não autoriza integração DATASUS existente.
