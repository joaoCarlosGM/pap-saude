# Manifesto de referências e artes

Este diretório contém **capturas e mockups de referência**, não telas implementadas nem fotos reais. As imagens foram convertidas a WebP para reduzir o pacote. A foto e nomes de personagens fictícios de alguns mockups NÃO autorizam pessoas nos banners: **os banners finais são sempre abstratos, sem figuras humanas**.

## Aprovadas para inspirar o layout

- `01-aprovadas/sidebar-mobile-com-curso-novo.webp`: posição de perfil, grupos, badge Cursos; **remover indicador vertical**.
- `01-aprovadas/sidebar-mobile-base.webp`: alternativa original de navegação mobile.
- `01-aprovadas/curso-vitrine-thumbnails-prazos.webp`: cards ricos, thumbnail, tags, prazos/validades, CTA.
- `01-aprovadas/curso-catalogo-thumbnail-filtros.webp`: grade e filtros; retrabalhar banners humanos.
- `01-aprovadas/admin-global-rede-light.webp`: rede Admin Global verde-petróleo LIGHT.
- `01-aprovadas/admin-rede-municipio-unidade-dark.webp`: Município→UBS/hospital e abas equipe DARK/LIGHT.
- `01-aprovadas/admin-paineis-light-dark.webp`: hierarquia e tema.
- `01-aprovadas/manager-catalogo.webp`: catálogo de conteúdos editáveis PAP_MANAGER.
- `01-aprovadas/manager-detalhe-curso.webp`: editor de curso e abas de conteúdo/versões.
- `01-aprovadas/manager-formulario-novo-curso.webp`: formulário stepper Novo curso.
- `01-aprovadas/manager-editor-html-player.webp`: edição visual e player interativo de aprendizagem.
- `01-aprovadas/health-unit-admin-distribuicao.webp`: distribuir curso por unidade; IMPORTANTE adaptar para MESMO SHELL DO PROFISSIONAL, não criar sidebar Admin isolada.

## Situação atual (problemas identificados)

- `02-situacao-atual/vitrine-pacientes.webp` vs `operacional-pacientes.webp`: disparidade da UX de pacientes, NÃO unificar dados.
- `02-situacao-atual/sidebar-vitrine-antiga.webp`: ordem ruim dos módulos; substituir.
- `02-situacao-atual/sidebar-barrinha-ativa-remover.webp`: barra vertical **proibida**.
- `02-situacao-atual/curso-vitrine-antigo.webp`: falta de thumbnail/validade.
- `02-situacao-atual/admin-global-antigo.webp`: UI minúscula/espalhada.
- `02-situacao-atual/comercial-atual.webp`: referência de paleta verde-petróleo comercial; apenas referência de marca, não copiar grants.

## Inspiração extra

- `03-inspiracao/dashboard-card-foto-perfil.webp`: ideia de foto no avatar e hero; **não copiar KPIs gráficos**, não copiar personagens para banner.
- `03-inspiracao/sidebar-ajuda.webp`: cartão Precisa de ajuda?
- `03-inspiracao/curso-detalhe-expiracao.webp`: cards e prazos.

## Assets novos originais de apoio

- `../assets/banners/*.svg`: 15 banners vetoriais originais sem pessoas, páginas clínicas e Admin/Manager. Arte decorativa sem texto; página deve renderizar H1/subtítulo no DOM.
- `../assets/thumbnails/*.svg`: seis thumbnails abstratas ilustrativas de conteúdo DEMO; não são conteúdo educacional homologado nem fotografias clínicas.

**Não incluímos nem versionamos a captura de terminal com e-mails e senhas** da última mensagem. Nunca incorporar `seed-accounts.json`, `.env`, chaves MFA, tokens, dumps ou screenshots contendo credenciais.

**Aviso de implementação:** nomes, datas, contagens, médicos fictícios e porcentagens de mockups são placeholders; jamais popular DB operacional com números visualmente convenientes. O curso HTML final precisa carregar dados de versão e matrícula autorizados.
