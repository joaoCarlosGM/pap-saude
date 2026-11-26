---
name: pap-saude-flow-reveal
description: Implement approved progressive flowchart construction animation for PAP Saúde protocols, using the PAP brand palette while preserving all three original PDF diagrams' text, decisions, arrows, branches and clinical provenance. No authored clinical shortcuts.
---

# PAP Saúde — H42: construção animada de fluxogramas

**Leia:** `docs/release/beta1-immersive-ux-h38-h42/FLUXOGRAMAS-CONSTRUCAO-PROGRESSIVA.md`, `CONTRATO-VISUAL-APROVADO.md`, `docs/release/beta1-ux-final-h29-h37/MATRIZ-FLUXOGRAMAS.md`; depois abra os 3 PDFs originais em `docs/protocolos/documentos-originais/` e confronte **visualmente** as páginas de fluxogramas e a lista de todas as decisões.

## Fidelidade visual/funcional
- Frame visual único da Vitrine: título, tabs Visão Geral / Fluxograma / Checklist preservadas, toolbar compacta sob a tab, canvas branco com nós arredondados, arestas vetoriais com seta, níveis alinhados, sem desordem.
- Paleta **PAP Saúde**, não verde/laranja/vermelho original. Usar `#C41469` como acento de elemento focado, superfícies rosa muito suaves, texto navy/slate, cinzas neutros e ícones Lucide da base existente. Os diagramas originais permanecem disponíveis como PDF inalterado.
- Construção ao abrir: estado inicial de entrada (sem overlay que bloqueie acesso), cada nó surge e então a aresta é desenhada em sequência; decisões revelam ramificações documentadas. Todos os ramos coexistem ao fim, inclusive caminhos NÃO. Não simular apenas uma rota nem trocar conteúdo por resumo.
- Controles: `Reproduzir`, `Pausar/Continuar`, `Reiniciar`, `Ver completo`, zoom +/–, ajustar, tela cheia e PDF original. Ações reais, clicáveis e acessíveis.
- Interação não pode fazer a pessoa esperar: `Ver completo` revela instantaneamente; clique em nó pausa o autoplay e abre detalhe em painel sem ocultar o restante, respeitando foco e teclado.
- O fluxo documental pode ser linear ou ramificado: representar corretamente cada `SIM/NÃO`, legenda, dose/nota/rodapé textual **sem omissão**. Quando a figura original é difícil de ler, abrir recorte do PDF sem transcrever incorretamente. Não inventar relações ou recomendar condutas.
- `prefers-reduced-motion` mostra diagrama completo sem animação. Durante animação: foco de teclado e leitores de tela acessam conteúdo já revelado; não automatizar prescrição nem mudança de dados da paciente.
- Inspecionar SVG paths com coordenadas reais; não usar apenas uma lista de cartões empilhados fingindo conectores ou espaçamento incorreto. Reflow desktop/mobile com pan e zoom, sem corte global.

## Fonte e aceite
- Fluxos: síndrome hipertensiva na gestação (seção 13), hemorragia pós-parto (seção 12) e sepse obstétrica (Apêndice A). A fonte efetiva é PDF, não concept ilustrativo.
- Comparar nó-a-nó, ramo-a-ramo e texto-a-texto; checklist de integridade clínica passa por revisão humana quando há dúvida de transcrição, antes de uso clínico real.
- Evidência: capturas de 0%, 25%, 50%, 75%, 100%, botões, modo reduzido, mobile 390, tela cheia. Não afirmar fidelidade clínica integral sem comparação documentada.
