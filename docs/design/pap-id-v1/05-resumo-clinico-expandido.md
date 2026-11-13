# Cartão validado com resumo clínico mínimo

**Imagem:** `images/05-resumo-clinico-expandido.png` (arquivo original: `a_polished_web_app_screenshot_same_registro_mul.png`). **Categoria:** conceito/referência, não UI implementada. **Passo:** 1/5.

### Objetivo
Após autorização clínica completa, enriquecer o cartão da paciente com cinco informações-chave solicitadas: **última queixa, DPP, alergias, idade gestacional e último escore MEOWS**. A informação é **prévia e histórica**, não substitui reavaliação clínica.

### Anatomia
- Faixa verde sutil «Gestante encontrada» com `check-circle`, somente depois da identificação.
- Cartão rosa pálido com nome, nasc., CNS minimizado, unidade de origem conforme permissão e selo verde «Identidade validada».
- Linha de **cinco cartões** de indicadores (ícones contornados, divisores suaves e labels de 12–14px): (1) «Semana gestacional» valor 32 semanas + 3 dias, (2) «DPP (prevista)» data, (3) «Último MEOWS» pontuação + estado por regra validada e horário, (4) «Última queixa» trecho curto + data, (5) «Alergias» agente(s) / «Desconhecido» / «Nenhuma conhecida», com estado de verificação. Valores no mock são fictícios e **não devem ser fixtures clínicas oficiais**.
- Componente em grid 5 colunas desktop largo, 2–3 cols tablet, coluna única ou carrossel horizontal acessível em mobile sem cortar dados prioritários.
- Link «Ver prontuário completo» apenas se leitura autorizada.
- Bloco de escolha de ação (prontuário / atendimento) coerente com 04; manter Stepper e rodapé originais.

### Contrato dos campos
`gestationalAge`: derivado no backend conforme DUM/ultrassom qualificado e data de referência, exibir origem e «não informado» se insuficiente.
`estimatedDueDate`: última DPP vigente, mostrar se estimada.
`lastMeows`: avaliação mais recente **finalizada e autorizada**, número, momento, versão do algoritmo e escopo da unidade; jamais calcular diretamente do mock ou misturar definições MEOWS divergentes entre protocolos.
`lastComplaint`: queixa principal de encontro anterior autorizado, com origem e data, texto curto; nunca afirmar que é quadro atual.
`allergies`: separar alergia conhecida, nenhuma declarada e desconhecida; risco de dados de origem diferente exige destaque, sem inferir ausências.
Dados podem vir de múltiplas unidades **apenas se o escopo longitudinal de compartilhamento tiver sido aprovado**. Se não, exibir «Acesso indisponível» sem inferir ausência.

### Segurança e clínica
Não mostrar esse resumo no estado de leitura QR ou mera validação de CPF/RG. Antes, exigir vínculo/autorização. «MEOWS 0» não significa ausência de risco nem garante segurança clínica. Alertas não são diagnóstico automatizado. Em caso de dados desatualizados, indicar data, não ocultar. Os três PDFs recebidos de pré-eclâmpsia/HPP/sepse são referências institucionais, não substituir homologação do motor de regras.

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

