# Resultados por solicitação

PASS refere-se ao que foi observado no executor. O aceite visual e funcional fica com o operador. Os testes de hardware e de exportação em papel são distintos dos testes no Chromium.

| ID | Resultado observado | Evidência e limite |
|---|---|---|
| H01 | PASS câmera simulada | Modal inicia sem preview ativo. A permissão negada oferece PNG/código. Webcam física, USB e perda real de permissão **NOT RUN**. [Câmera após leitura](evidence/camera-auto-close.png) |
| H02 | PASS mapa documental · BLOCKED conversão de critérios | Três mapas com conexões e proveniência. A figura integral permanece para as condições, intervenções e exceções que exigem revisão clínica. [Mapa](evidence/protocol-map-1440.png) · [Proveniência](PROTOCOL-EXTRACTION-MATRIX.md) |
| H03 | PASS artefatos | Frente rosa, verso branco, duas faces e QR no verso. [Cor](evidence/cartao-colorido.png) · [P&B](evidence/cartao-pb-detalhado.png) |
| H04 | PASS modelo mínimo e variante explícita | Verso padrão contém QR/datas. A variante detalhada usa dados da fixture com referência ou indica lacunas. [Contrato](PAP-ID-FRENTE-VERSO.md) |
| H05 | PASS matriz automatizada | Sete larguras em claro/escuro, checklist dos três protocolos a 390/1440 e axe seletivo. Paisagem e toque físico **NOT RUN**. [Comparativo](COMPARATIVO-VISUAL.md) |
| H06 | PASS Chromium | Entrada 260 ms, KPIs 360 ms, último atraso 455 ms e gráfico 850 ms. Movimento reduzido desativa o efeito. [Medições](evidence/motion-runtime.json) |
| H07 | PASS retorno único e URLs | Breadcrumb removido, busca preservada no retorno e abas no URL. Voltar, avançar e recarregar passaram na repetição sincronizada. [Alterações comparadas](COMPARATIVO-VISUAL.md) |
| H08 | PASS emissão em Documentos | Listagem navega para prontuário. Cadastro usa CTA para a aba. Banco próprio confirmou persistência. [Documentos](evidence/documents-1440.png) · [Contrato](PAP-ID-FRENTE-VERSO.md) |
| H09 | PASS exportações e impressão virtual | PNG colorido/P&B decodificados e PDFs A4 a 300 dpi com mesmo QR. Sessão e escopo por paciente na borda privada. QR em papel **NOT RUN**. [Impressão virtual](evidence/virtual-print.txt) |
| H10 | PASS perfil no Chromium | Nome completo, função e UBS/cidade, ações e foto sincronizada em 375 px. [Sidebar](evidence/profile-sidebar-375.png) |
| H11 | PASS recorte, armazenamento e reset | Chromium rejeitou PNG inválido, recortou imagem, manteve após reload e limpou no reset. Matriz EXIF física **NOT RUN**. [Sidebar](evidence/profile-sidebar-375.png) |
| H12 | PASS fluxo de caixa de entrada | Eventos da Vitrine, filtros, leitura e contador. Leituras ficam na navegação corrente. |
| H13 | PASS consulta documental · BLOCKED revisão clínica | PDFs preservados byte a byte. As quatro abas possuem fontes por seção e elementos consultivos. Revisão dos critérios completos e direitos de redistribuição pendentes. [Matriz](PROTOCOL-EXTRACTION-MATRIX.md) |
| H14 | PASS histórico observado | Evento do formulário aparece na cronologia de atendimento salvo. Fixture histórica explicita ausência de aferições e de trilha. A jornada de 390 px passou isoladamente após timeout de navegação na rodada integrada. |
| H15 | PASS modal informativo e edição de foto | Backdrop, Escape, foco, rolagem e confirmação de descarte exercitados. Repetição após impressão validou Escape quando o browser perde foco. |
| H16 | PASS autorização privada | Consentimento saiu da barra fixa. A autorização temporária e o encerramento continuam em Configurações. HTTPS em Chromium e regressões de sessão passaram. [HTTPS](evidence/https-runtime.json) |
| H17 | PASS câmera simulada | QR válido fecha leitor, encerra todos os tracks, mostra cartão, mantém o primeiro ao reabrir e deduplica leitura repetida. Conferência documental requer clique. [Câmera após leitura](evidence/camera-auto-close.png) |

[Execuções de navegador](evidence/browser-resultados.txt) registram a rodada integrada e as repetições.

Standalone e imagem Docker de produção **NOT RUN** nesta candidata. A geração Prisma usada no build integral ficou **BLOCKED** pelo proxy. [Verificações](evidence/verificacoes.txt)
