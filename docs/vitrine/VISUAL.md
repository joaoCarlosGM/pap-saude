# Comparação visual

Capturas da base `4089621` geradas **antes de editar componentes**; capturas posteriores identificadas abaixo. Mesmos viewports e Chromium, com movimento reduzido. Todos os dados exibidos são fixtures sintéticas. O bloqueio do Google Fonts afetou ambas as versões: estas imagens mostram o mesmo fallback local; os imports, famílias declaradas e classes de tipografia originais foram mantidos.

| Página | Antes desktop | Depois desktop | Antes mobile | Depois mobile |
|---|---|---|---|---|
| Dashboard | [1440](evidence/before-dashboard-1440.png) | [1440](evidence/after-dashboard-1440.png) | [390](evidence/before-dashboard-390.png) | [390](evidence/after-dashboard-390.png) |
| Registro | [1440](evidence/before-registro-1440.png) | [1440](evidence/after-registro-1440.png) | [390](evidence/before-registro-390.png) | [390](evidence/after-registro-390.png) |
| Pacientes | [1440](evidence/before-pacientes-1440.png) | [1440](evidence/after-pacientes-1440.png) | [390](evidence/before-pacientes-390.png) | [390](evidence/after-pacientes-390.png) |
| Ficha | [1440](evidence/before-ficha-1440.png) | [1440](evidence/after-pacientes-maria-gracas-1440.png) | [390](evidence/before-ficha-390.png) | [390](evidence/after-pacientes-maria-gracas-390.png) |
| Atendimentos | [1440](evidence/before-atendimentos-1440.png) | [1440](evidence/after-atendimentos-1440.png) | [390](evidence/before-atendimentos-390.png) | [390](evidence/after-atendimentos-390.png) |
| Chat | [1440](evidence/before-chat-1440.png) | [1440](evidence/after-chat-1440.png) | [390](evidence/before-chat-390.png) | [390](evidence/after-chat-390.png) |

Novas subseções, com os componentes existentes: histórico [desktop](evidence/after-history-1440.png) / [mobile](evidence/after-history-390.png); resultado [desktop](evidence/after-result-1440.png) / [mobile](evidence/after-result-390.png).

Inspeção: sidebar branca/ordem, topbar verde-petróleo, oito cartões nas mesmas grades, cores rosa e fundo claro, tabelas/abas e cinco etapas preservados. Alterações intencionais: indicador sintético, valores/estados coerentes, retirada de tendências inventadas, altura zero em barras de valor zero, subseções necessárias, animação e correções mobile/acessibilidade. Sem redesign, nova biblioteca UI ou IA externa.

As seis larguras de teste são 320, 375, 390, 430, 768 e 1440 px. A matriz browser passou por dez páginas em cada largura e pelas etapas longas do Registro. Sem overflow de página, erros JS ou animação de estrelas no modo de movimento reduzido. Isso não substitui a revisão humana das fontes no ambiente com conectividade externa.
