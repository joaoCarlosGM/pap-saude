---
name: pap-saude-concept-fidelity
description: Enforce exact PAP Saúde approved visual concepts and existing UI shell with explicit token, icon, spacing, rounding, responsive and screenshot-diff gates. Mandatory for H38-H42 and Agenda banner; do not invent new layouts, visual semantics or fields.
---

# PAP Saúde — fidelidade visual (contrato obrigatório)

Para o Registro (etapas 2, 3 e 4), o contrato visual mais preciso é `docs/release/beta1-immersive-ux-h38-h42/REGISTRO-FIDELIDADE-VISUAL-CONCEPTS-APROVADOS.md`. **Leia antes do contrato genérico** e trate as diferenças entre imagens e campos da branch como adaptação de conteúdo, nunca licença para refazer o layout. A comparação pixel a pixel exige acesso às imagens originais no ambiente de execução.


## Ordem de precedência
1. Arquivo original e comportamento funcional na branch de base; nenhum dado/validação/ação pode desaparecer.
2. **Concept aprovado pelo operador**, descrito no documento `docs/release/beta1-immersive-ux-h38-h42/CONTRATO-VISUAL-APROVADO.md`.
3. Assets e tokens existentes do próprio PAP Saúde: `src/components/premium/{RouteHero,SectionHero}.tsx`, `public/brand/banners/*.svg`, componentes de Vitrine, `src/features/vitrine-premium/views`.
4. Diretrizes de acessibilidade e requisitos de segurança clínica.
5. Criatividade do agente: **nenhuma alteração de layout, cor, conteúdo clínico, copy, navegação ou componente novo sem respaldo nesses itens**.

Leia também `../pap-saude-registration-ux/SKILL.md`, `../pap-saude-flow-reveal/SKILL.md` conforme a área; mantenha as três skills preexistentes `pap-saude-ui-design`, `pap-saude-visual-qa`, `pap-saude-clinical-ux`.

## Procedimento obrigatório
- Para cada tela: extrair árvore de componentes atual, todos os campos e suas dependências; preencher matriz ATUAL → CONCEPT → IMPLEMENTAÇÃO → TESTE antes do JSX.
- Criar captura **antes** no mesmo viewport/estado e comparar captura **depois**, com sidebar/hero/Stepper preservados. Se imagem aprovada não estiver disponível no workspace, NÃO declarar fidelidade pixel-a-pixel; usar contrato textual e registrar que o comparativo com imagem está pendente. Solicitar a imagem apenas se necessário para precisão visual; não substituir por imagem gerada.
- A composição e os novos ícones devem seguir a especificação; não criar banners ou cards fora do escopo, não alterar o design do menu lateral.
- Reaproveitar os SVGs locais, ícones Lucide já instalados, Tailwind existente e componentes UI compartilhados. Sem icon packs, frameworks ou fontes novos.
- Diferenciar **layout** de **conteúdo**: values, datas, recomendações, dose, MEOWS, IG/DPP e rótulos dos exemplos em concepts NÃO são dados do sistema e nunca devem ser hardcoded.
- Os dados sintéticos da vitrine devem ser coerentes e segregados. Identificação geral discreta da natureza fictícia é suficiente na apresentação; controles de autorização privada de dados/QR/PDF reais não podem ser burlados. Mode de apresentação seguro precisa de ativos sintéticos de leitura sem tokens privados.
- Breakpoints de inspeção: 320, 375, 390, 430, 768, 1024, 1440. Sem overflow horizontal; elementos interativos de pelo menos 44px, `prefers-reduced-motion`, foco visível.

## Verificação de qualidade
- Testar teclado, estados vazios e preenchidos, campos condicionais, salvar/desfazer, mobile teclado aberto, autenticação/fixture, dark mode se suportado, reinício e formulário com valores longos.
- Evidência concreta: caminhos dos screenshots antes/depois, lista de diffs fora do alvo (deve ser vazia), screenshot do banner Agenda ao lado do Registro, checklist campo-a-campo.
- Bloquear PASS se faltam campos da etapa atual, se sumiu resumo do risco ou se a referência visual não foi comparada. Repetir suíte após ajustes.
