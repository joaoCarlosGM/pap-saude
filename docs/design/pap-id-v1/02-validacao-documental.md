# Gestante localizada: confirmação documental

**Imagem:** `images/02-validacao-documental.png` (arquivo original: `validação_de_identidade_da_gestante.png`). **Categoria:** conceito/referência, não UI implementada. **Passo:** 1/5.

### Objetivo
Após identificação por credencial PAP válida, confirmar identidade **antes** de solicitar vínculo ou abrir prontuário. Esta tela não representa autorização clínica concedida.

### Layout
- Mesmo wizard central e Stepper (1 ativa).
- H2 «Validar identidade da gestante», explicação curta.
- Cartão de apresentação rosa muito pálido, cantos ~12–16px, borda rosa discreta, ícone circular de pessoa à esquerda; título «Gestante localizada»; etiqueta rosa «Encontrada via QR Code».
- Dados em duas colunas no desktop (nome, nascimento; CNS/UBS de origem apenas se autorizados). Em produção, **mascarar/minimizar CNS e demais dados até as verificações de contexto e identidade**; imagem contém exposição ilustrativa, não replicar literalmente.
- Cartão branco de «Confirmação de identidade» com controle `CPF | RG`. Campo CPF mascarado com validação de dígitos; RG exige número, UF/órgão emissor se aplicável; diferentes documentos podem ser exigidos conforme política, não como senha. Não guardar valor bruto em analytics.
- Nota lilás informando que a validação precede escolha de ação; rodapé «Voltar» e «Validar e continuar».

### Comportamento
O backend compara documento com cadastro qualificado, aplica limitação de tentativas e erros genéricos para evitar enumeração. Profissional permanece com MFA e instituição válidos. Conferência documental não substitui confirmação presencial, finalidade e base legal de acesso. Não expor indicador «identidade validada» antes de resultado servidor. Em caso de documento ausente usar fluxo assistencial supervisionado, não bloquear cuidado de urgência.

### Testes
Documento divergente, cartão revogado, usuário sem papel, tentativas excessivas, RG com UF distinta, expiração, troca UBS, refresh, replay, respostas minimizadas.

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
