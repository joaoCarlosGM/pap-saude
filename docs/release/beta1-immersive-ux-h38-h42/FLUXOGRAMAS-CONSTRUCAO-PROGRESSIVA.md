# H42 — Fluxogramas PAP Saúde: execução animada progressiva, fiel aos PDFs

**Não alterar documentos clínicos de origem.** Isto especifica como REVELAR a representação original, não reescreve seu conteúdo. Reutilizar as referências dos documentos originais no repositório e `docs/release/beta1-ux-final-h29-h37/MATRIZ-FLUXOGRAMAS.md`.

## Composição da tela aprovada
Cabeçalho dos Protocolos e tabs `Visão Geral | Fluxograma | Checklist` intactos. A aba Fluxograma contém:
1. Toolbar na linha acima do canvas: `Reproduzir / Pausar` (controle do estado), `Reiniciar`, `Ver completo` (atalho destacado secundário), `PDF original`, `− 100% +`, `Ajustar`, `Tela cheia`; ícones `Play,Pause,RotateCcw,Maximize,FileText,Minus,Plus` do pacote Lucide existente.
2. Canvas com borda cinza fina, raio 16px, fundo branco, sem degradê saturado, nós de raio 12px e linhas/arestas vetoriais. Uma única estrutura sem várias listas duplicadas.
3. Nós da rede exibidos conforme topologia aprovada pela fonte documental (incluindo simultaneidade, retorno e SIM/NÃO). Cor do tema PAP: rosa institucional `#C41469`, rosa pálido em superfícies, cinza/slate para conexões; **não copiar as cores temáticas originais**. Os PDFs permanecem com as cores originais.
4. Detalhamento clínico: clique num nó abre painel discreto de detalhes vinculados a nó/etapa (texto exato e número da página), com botão voltar; a animação não omite detalhes que constam da fonte, mas não deve jogar doses completas sobre blocos minúsculos.
5. Fonte: link `Documento original, página N` abre figura correta, acessível sem redigir conduta nova.

## Sequência de reprodução — máquina de estados
- `idle`: entrada na aba Fluxograma com canvas preparado, foco e legendas; pode iniciar automaticamente após montagem (respeitar preferência de movimento).
- `playing`: exibe primeiro nó; em seguida desenha aresta e revela próximo nó. Cada unidade 250–350ms, delay curto; nos nós com bifurcação, revelar TODAS as arestas documentadas com labels `SIM`/`NÃO` e criar os nós filhos correspondentes.
- `paused`: cancelar a progressão enquanto mantém nós já revelados; permite interagir com eles e abrir detalhe.
- `complete`: todos os nós e conectores visíveis. `Ver completo` vai diretamente para esse estado de qualquer ponto, sem animação.
- `restarted`: limpa apenas estado de animação/seleção visual, nunca histórico clínico/documentos; volta a `playing` somente com intenção de replay.
- Ao sair/entrar na aba, uma nova abertura pode disparar a animação desde o começo, mas não impedir abertura imediata em `Ver completo`.
- Se `prefers-reduced-motion:reduce`, iniciar diretamente `complete`; tooltip explica o controle sem interromper o usuário.
- Usa relógio/raf com cleanup, cancela animação ao unmount; sem timers vazando, sem múltiplas sessões simultâneas. Testes com fake timers e navegador real.

## Fidelidade por PDF
- **Síndromes hipertensivas na gestação:** seção `13. FLUXOGRAMA`, documento `Pré eclampsia.pdf` / `docs/protocolos/documentos-originais/`; a figura tem decisão de critérios com ramificação `SIM/NÃO`, notas, estratégias em paralelo e decisão subsequente de estabilização. Capturar cada nó e seta, sem trocar números, critérios, medicamentos ou lógica.
- **Prevenção/manejo da hemorragia pós-parto:** seção `12. FLUXOGRAMA`, `Hpp.pdf`, cinco passos numerados, conteúdos associados em caixas e reavaliação contínua. O concept animado aprovado mostra estes cinco passos surgindo progressivamente: ativação → equipe/estabilização → ressuscitação hemodinâmica → quatro Ts → tamponamento → abordagem cirúrgica → reavaliação. No documento exato, textos e condições desses passos devem ser representados sem perder informação.
- **Sepse em pacientes obstétricas:** `Sepse.pdf`, `APÊNDICE A – Fluxograma da paciente obstétrica com suspeita de Sepse`; estrutura em fases Reconheça/Resuscite/Responda/Reavalie, intervenções e ramo final de `Estável?` SIM/NÃO. Na reprodução, manter blocos da via e todas as ações laterais do PDF.
- Não copiar conceitos passados que resumem doses ou critérios. Não corrigir o conteúdo do PDF com conhecimento do modelo, mesmo se uma orientação parecer controversa; preservar texto, apontar dúvida para revisão clínica.
- Criar matriz `nodeId, tipo, texto literal e localização da fonte, ramificações, ligação destino, estado de animação, evidência screenshot`. Se uma conexão do PDF não for identificável, manter `BLOCKED clinical review` para esse trecho e oferecer figura original íntegra; jamais afirmar paridade total.

## Aceite visual e funcional
- Playwright grava frames `0%,25%,50%,75%,100%` e estado final contra screenshot da figura/PDF. Número de fases da animação NÃO equivale ao número de etapas clínicas.
- Teclado consegue `Tab` por nós/controles; `aria-live` discreto, SVG `title`, labels completos de arestas; panning teclado e mouse, pinch/touch se disponível; `Esc` sai do fullscreen quando suportado.
- Mobile 390px mantém zoom/pan dentro do canvas, sem overflow global. Não fazer legendas de fonte ilegíveis.
- Não modificar Visão Geral/Checklist ou PDF original. Testar diff visual dessas abas = sem mudança.
