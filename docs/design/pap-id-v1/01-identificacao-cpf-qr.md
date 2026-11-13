# Identificação: CPF / Carteirinha PAP / cadastro manual

**Imagem:** `images/01-identificacao-cpf-qr.png` (arquivo original: `registro_de_gestante_com_qr_code.png`). **Categoria:** conceito/referência, não UI implementada. **Passo:** 1/5.

### Objetivo
A primeira etapa do wizard apresenta três modos de identificação, sem mudar as cinco etapas do Registro. A composição conceitual exibe busca CPF à esquerda e QR à direita, com divisor central «ou»; **ajuste de implementação aprovado posteriormente**: preferir seletor compacto de modo e painel único para respeitar melhor a Vitrine oficial.

### Estrutura e microcomponentes
1. Manter header e Stepper original (etapa 1 rosa).
2. Título «Identifique a paciente» e descrição: «Escolha uma forma de identificar uma gestante já cadastrada no PAP Saúde.»
3. Segmented control `CPF | QR Code | Cadastro manual`, rosa apenas no selecionado. Borda `#E2E8F0`, fundo branco, indicador rosa claro `#FFF1F6`.
4. Modo CPF: rótulo, input com máscara `000.000.000-00`, botão rosa «Buscar dados» com lupa. Texto deve ser «Buscar na base do PAP» em ambiente operacional; **não afirmar integração DATASUS sem contrato externo real**.
5. Modo QR: ilustração central rosa de câmera/QR, botão «Ler QR Code», ação secundária «Digitar código», nota de segurança de baixo destaque.
6. Modo manual: inputs originais do wizard, fluxo de validação duplicidades, sem criação automática ao escolher modo.
7. Rodapé «Próximo» desabilitado até escolha/validação suficiente.

### Interações/estados
`idle | cpf_loading | qr_permission | qr_scanning | code_manual | found_pending_verification | not_found | invalid_credential | backend_error`. Scanner inicia apenas por gesto; pede permissão; para câmera no desmontar/cancelar e após leitura. Não incluir QR em analytics/logs. Validação em backend autorizada. Indisponibilidade de câmera oferece fallback manual.

### Critérios de aceite
A troca de modo não apaga informação clínica não relacionada sem avisar; Ctrl+Tab/leitores de tela acessam o seletor; loading e erro não ficam só por cor; layout original permanece reconhecível.

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

