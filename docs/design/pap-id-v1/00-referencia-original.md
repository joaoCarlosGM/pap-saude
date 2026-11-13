# Referência original fornecida: Registro / Identificação

**Imagem:** `images/00-referencia-original.png` (arquivo original: `image(20261113-233311).png`). **Categoria:** conceito/referência, não UI implementada. **Passo:** 1/5.

### Valor de referência
Captura original fornecida para **preservar identidade visual real da Vitrine**: página branco amplo, cabeçalho «Registro / Iniciar novo atendimento», cartão central branco arredondado de baixa elevação, Stepper em cinco etapas, título «Identifique a paciente», busca CPF, botão rosa «Buscar dados», divisor inferior e «Próximo» rosa no canto direito.

### Regras de preservação
1. Usar medidas e classes CSS reais do repositório como verdade principal, imagem como referência visual; `RegistrationWizard` usa `max-w-5xl` e p-4/p-6/p-8, `Stepper` trata mobile separado.
2. Não inserir nova barra lateral, novo cabeçalho ou novos itens no menu.
3. Com QR, preservar área de trabalho principal; preferir tabs/segmentos discretos para alternar identificadores dentro da etapa 1.
4. Aviso da arte original cita DATASUS; na Vitrine do código real esse serviço não é consultado. Corrigir microcópia para «base demonstrativa», nunca prometer consulta pública inexistente.
5. Não implementar fluxo clínico real no deployment Admin+Comercial; manter mock isolado da P0.


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

