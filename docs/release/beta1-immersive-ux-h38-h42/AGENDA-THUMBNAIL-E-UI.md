# Agenda — correção de banner/thumbnail no padrão da Vitrine (H43, ajuste lateral da PAP-B1-UX-04)

## Reprodução
Captura de homologação enviada pelo operador: tela Agenda apresenta somente o título 'Agenda' e listagem, **sem o banner ilustrado rosa** que a página Registro tem. A outra captura do operador mostra o hero de Registro com gradiente e ícone, e a frase geral de natureza sintética.

## Causa confirmada pelo código
- `src/components/premium/RouteHero.tsx`: objeto `sections` possui `registro`, `atendimentos`, `pacientes`, `protocolos` etc. **Não possui `agenda`**.
- `src/components/premium/SectionHero.tsx`: mesmo componente serve todos os banners, com `img src="/brand/banners/${visual}.svg"`, `960×220`, `section-hero--clinical`.
- `public/brand/banners/{registro,atendimentos}.svg`: forma visual aprovada; fundo `#FFF0F7→#F6CBE0`, ondas `#C41469` opacidade .17, círculo branco decorativo, retângulo 960×220 rx20, outline de ícone + pequenos pontos.
- `src/features/vitrine-premium/views/agenda.tsx`: atualmente renderiza cabeçalho `Agenda` e `AgendaPanel`, mas o hero é responsabilidade de `RouteHero`. Não duplicar.

## Implementação precisa sem inventar
1. `RouteHero.sections` adicionar chave `agenda: ["Agenda","agenda"]`, preservando as demais.
2. Criar `public/brand/banners/agenda.svg` clonando o SVG `atendimentos.svg`: **mesmos** `width,height,viewBox,rx,gradiente,curvas,círculos,opacidades,ícones em traço`, substituir somente o desenho de ícone interno por **calendário mensal com grade** na mesma caixa `<g transform="translate(95,-6)"...>`. Não mudar cor/sombra/relevo/tamanho. Se SVG já estiver disponível por commit concorrente, fazer comparação e reaproveitar.
3. Reutilizar `SectionHero`. O hero da Agenda usa título `Agenda` e subtitle global do modo vigente; não escrever uma mensagem nova ou duplicada. No modo Vitrine imersiva, manter aviso geral discreto de dados sintéticos no nível global, sem avisos a cada módulo.
4. Preservar `AgendaPanel`, botão `Novo compromisso`, filtros Situação/Tipo/Período, modal, sincronização com prontuário, persistência e estados. **Não redesenhar essa área nesta tarefa**, somente coerência do banner.
5. `RouteHero` usa `headingAs="p"`, então h1 da página Agenda continua sem duplicação semântica; não adicionar heading h1 ao hero.
6. Capturas com mesmo viewport 1440/390: Agenda e Registro acima da dobra, bordas, gradiente, raio, alturas e recuos idênticos; diferença somente ícone e título.

## NÃO FAZER
- Não redesenhar sidebar, filtros, lista ou botão.
- Não utilizar emoji, novo pacote, imagem stock, ícone 3D ou gradiente inventado.
- Não importar a imagem de conceito como fundo; seguir SVG local versionado.
- Não gerar mensagens de 'homologação' em cada compromisso.
