# UX — design system, sidebar, banners e tela a tela

## Tokens e geometria

- Vitrine/Clínica: primário `#C41469` (magenta existente), superfície `#FFFFFF`, fundo suave `#F9F7FA`, texto `#152239`, texto secundário `#64748B`. Reutilizar `src/components/premium/premium.css` e tokens existentes antes de inventar uma segunda paleta.
- Admin global e PAP_MANAGER: verde-petróleo **light/dark**: `--admin-950: #052F32`, `--admin-900: #063D40`, `--admin-700: #0B6664`, `--admin-500: #008F83`, `--admin-100: #DDF5EE`; superfícies white no light e slate/petróleo de contraste legível no dark. Não confundir escopo de tema com grants.
- Sidebar: `256px` desktop, `72px` compacta opcional, altura `100dvh`, navegação com overflow interno, item `44-48px`, padding `12-16px`; mobile drawer com overlay, Escape, foco inicial/restauração, labels acessíveis e `aria-current=page`.
- ATIVO: fundo magenta/verde-petróleo `~8%`, texto e ícone da marca; **proibida barra vertical à esquerda**, pseudo-elemento/`ActiveIndicator` reintroduzido ou barra CSS.
- Banner: componente único `<SectionHero>` com `title`, `subtitle`, `visual`, `variant`, `actions?`; hero em `aspect-ratio` confortável, `min-height` ~150–220px desktop; mobile texto acima/arte lateral ou atrás com contraste AA. Título/texto reais no DOM, SVG decorativo `aria-hidden`.
- Tipografia: manter fontes locais do repo; evitar telas com corpo minúsculo, manter min. 14px, labels 12px; foco AA e movimento reduzido.
- Cards: raio 14–18px, bordas discretas, sem sombras exageradas; skeleton/errors/empty explícitos; clique integral sem elementos aninhados invalidamente.

## Ordem sidebar — clínica, unit admin e vitrine

- Cabeçalho `PAP Saúde`.
- Cartão Perfil: avatar foto circular `48–56px` (apenas imagem autorizada; fallback iniciais), nome, papel, município, UBS autorizada, seta para menu. Nunca mostrar Ana Paula/Belém fictícios na conta operacional real.
- **VISÃO GERAL:** Dashboard `/dashboard` (Vitrine `/vitrine`).
- **CLÍNICA:** Registro `/registro`, Atendimentos `/atendimentos`, Pacientes `/pacientes`.
- **CONHECIMENTO E APOIO:** Protocolos `/protocolos`, Ferramentas `/ferramentas`, Chat IA `/chat`, Cursos `/cursos`.
- **SISTEMA:** Avisos/Notificações (rota existente), Configurações `/configuracoes`.
- Rodapé: `Precisa de ajuda? — Acesse o suporte ou nossos tutoriais.` com 2 ações, `Iniciar tutorial guiado` e `Solicitar suporte de TI`.
- Conteúdo mostrado SOMENTE para papel/grant autorizado, não exibir módulo inexistente como operativo. O `HEALTH_UNIT_ADMIN` usa este MESMO shell, não novo painel paralelo.
- Marcador `Cursos · Novo` apenas se cursos recém-liberados elegíveis ao usuário (demo simulado); guardar leitura/estado por usuário sem contagem hardcoded.

## Banners SEM personagens em todas as rotas

| Rota | Título | Conceito visual permitido | Fonte de dados |
|---|---|---|---|
| `/dashboard`, `/vitrine` | Visão geral | mapas/ondas/cartões abstratos, símbolo +, rede | KPIs originais, inalterados |
| `/registro`, `/vitrine/registro` | Registro | campos, checklist, formas abstratas | APIs de registro / fixtures |
| `/atendimentos`, `/vitrine/atendimentos` | Atendimentos | agenda + traços abstratos | APIs reais / demo |
| `/pacientes`, `/vitrine/pacientes` | Pacientes | fichas geométricas | pacientes reais escopados / demo |
| `/protocolos`, `/vitrine/protocolos` | Protocolos | documentos e livro geométrico | aviso indisponível / demo |
| `/ferramentas`, `/vitrine/ferramentas` | Ferramentas | ferramentas/engrenagens | aviso indisponível / demo |
| `/chat`, `/vitrine/chat` | Chat IA | balões/pontos/circuitos abstratos | aviso não homologado / demo |
| `/cursos`, `/vitrine/cursos` | Cursos | livros, certificado, play geométrico | LMS real / fixtures |
| notificações/avisos | Avisos | sino/formas/pontos | inbox real / demo |
| `/configuracoes`, `/vitrine/configuracoes` | Configurações | engrenagem/camadas | perfil/autorização / demo |
| `/admin/*` | título da seção | rede municipal e unidades abstratas | API Admin real |
| páginas MANAGER | ações da seção | rede/curso/editor abstrato | autorização real |

Assets propostos em `assets/banners/*.svg` (servidor os usa como arte decorativa se aprovados; a animação pode ser CSS leve). **NÃO usar humanos nem fotografias no banner**. `referencias/` contém mockups antigos com personagens APENAS para inspirações de grid, não copiar seus personagens para novos banners.

## Paridade operacional versus vitrine

| Módulo | Conteúdo Vitrine | Conteúdo operacional | Implementação de UI |
|---|---|---|---|
| Dashboard | números fictícios aprovados | KPIs reais já aprovados, **sem alterar** | componente visual com providers distintos |
| Pacientes | cards horizontais ricos | cards horizontais com nome, idade calculada, IG/DPP/alergias SOMENTE quando dados válidos autorizados | adaptar lista de cards; sem score demo |
| Prontuário | abas fictícias | abas/seções de APIs reais, dados indisponíveis honestos | `PatientRecordView` com design aprimorado |
| Atendimentos | tabela + filtros demo | tabela/visual consistente com ações e transições reais | nunca falsear risco/profissional se API não disponibiliza |
| Registro | wizard simulado | wizard idempotente persistente | preservar contratos, igualar aparência |
| Cursos | seis cursos demo, badges e prazos fictícios | catálogo atribuído e progresso DB | mesmos CourseCards, providers separados |
| Chat IA / Ferramentas / Protocolos | dados fake e navegação demo | somente aviso de indisponibilidade até homologação | igual estilo, texto honesto |
| Configurações | mock | ownProfile real | UI igual sem toggles falsamente persistentes |

## Foto do perfil

- Vitrine: avatar fictício de exemplo permitido, sem alegar que seja pessoa real da equipe; já existem referências aprovadas.
- Operação: **não** criar upload se não houver armazenamento seguro implementado e autorizado; usar fallback de iniciais sem quebrar a UI. Se implementar upload: autorização `ownProfile`, validação MIME/tamanho, armazenamento privado, resposta com URL segura, evitar imagens com dados EXIF sensíveis; não deixar `img src` arbitrário de terceiros.

## Conteúdo e cursos

- Curso 3 colunas desktop; 2 tablet; 1 mobile. Thumbnail 16:9 dentro do card; categoria e obrigatoriedade no topo; título/descrição; minutos/aulas; progresso; prazo; CTA.
- Status `não iniciado`, `em andamento`, `concluído`, `atrasado`, `certificado expirado` quando aplicável. Não chamar conclusão de curso de “expiração”; atraso significa prazo para concluir não cumprido.
- Valores de data do mockup são ilustrativos de outubro/novembro 2026 e não devem ser hardcoded como prazos atuais no operacional.
- `Novo` em Cursos apenas quando houver publicação/atribuição elegível dentro de período/estado real. Não colocar badge fake constante em produção.

## Help/Tour

Reaproveitar `src/components/onboarding/GuidedTourEngine` e `src/components/premium/ClinicalTour` respeitando permissões/versões; suporte de TI requer protocolo gravado e status real, ou CTA explícito de integração pendente. Não associar dados clínicos a chamado sem redigir e consentir; nenhum prompt de IA clínica.
