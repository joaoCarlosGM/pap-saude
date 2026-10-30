# Mapa técnico de implementação — arquivos do repositório e dependências

Esta lista reflete a árvore GitHub `feature/p0-premium-unified-rc` inspecionada no SHA `d247020d` em 30/10/2026. Antes de editar, conferir se mudou.

## Componentes pré-existentes que devem ser reutilizados

| Arquivo existente | Situação e alteração autorizada |
|---|---|
| `src/components/layout/Sidebar.tsx` | ordenar Dashboard/Clínica/Conhecimento/Sistema, perfil + foto opcional, Help, badge Cursos; eliminar barra vertical (inclusive ActiveIndicator CSS) |
| `src/components/layout/DashboardShell.tsx` | preservar shell clínico e `ClinicalTour`, acrescentar capa/banner universal; roles efetivos no server |
| `src/features/vitrine-premium/components/layout/Sidebar.tsx` | espelhar sidebar visual com `DemoProvider` somente Vitrine, sem API clínica |
| `src/features/vitrine-premium/components/layout/DashboardShell.tsx` | usar `SectionHero` e organização aprovada; não importar real DB |
| `src/components/premium/ActiveIndicator.tsx` | remover/neutralizar barra vertical VISUAL, sem prejudicar semântica `aria-current` |
| `src/components/premium/premium.css` | adicionar tokens compartilhaveis sem regressão Admin/Clínica |
| `src/components/admin/AdminSidebar.tsx` | passar de rosa para teal light/dark, manter busca, todos os links e guards |
| `src/components/admin/AdminShell.tsx` | alternância admin light/dark, help card e banners sem humanos |
| `src/components/admin/AdminTopbar.tsx` | preservar notificações reais, MFAs e perfis, alinhar cabeçalho |
| `src/app/(admin)/admin/rede/page.tsx` | lista real de municípios + busca e navegação autorizada |
| `src/app/(admin)/admin/rede/[organizationId]/page.tsx` | abas unidade, membros, responsáveis e histórico, com serviços reais ou ausência explícita |
| `src/app/(dashboard)/pacientes/page.tsx` | manter guard clínico, adaptar apresentação sem risco MEOWS fictício |
| `src/components/clinical/ClinicalPatientList.tsx` | fonte `listPatients` real, card rico com dados autorizados (pode exigir fetch agregado autorizado) |
| `src/components/workspace/PatientCollection.tsx` | substituir grade simplória por card premium shared/presentational sem import demo |
| `src/components/clinical/ClinicalPatientDetail.tsx` | preservar fetch guard, usar `PatientRecordView` aprimorado |
| `src/components/workspace/PatientRecordView.tsx` | ficha premium por abas/seções sem campos fictícios |
| `src/components/clinical/ClinicalEncounterList.tsx` | harmonizar tabela, filtros, badges, ações HTTP reais/403/409 |
| `src/components/registro/RegistrationWizard.tsx` | UX de 5 passos, manter operação idempotente/atomicidade/retomada |
| `src/components/dashboard/ClinicalDashboardView.tsx` | **NÃO mexer em KPIs, gráficos, consultas e somas**; somente capa/banner e layout não semântico |
| `src/server/clinical-dashboard/clinical-dashboard.service.ts` | PROTEGIDO: sem alterações salvo defeito demonstrado não originado desta missão |
| `src/app/(dashboard)/cursos/page.tsx` | hoje `ClinicalModuleNotice`: substituição por catálogo operacional real autorizado |
| `src/features/vitrine-premium/views/cursos.tsx` | hoje `mockCursos`: adaptar ao `CourseCatalog` visual compartilhado, mantendo provider fictício |
| `src/features/vitrine-premium/components/cursos/` | referência visual para cards existentes; extrair somente views puras |
| `src/components/onboarding/GuidedTourEngine.tsx` | reutilizar com permissões e targets reais |
| `src/components/premium/ClinicalTour.tsx` | manter; iniciar a partir de Ajuda |
| `src/server/iam/system-role-catalog.ts`, `src/server/iam/permissions.ts` | acrescentar SOMENTE grants do LMS necessários; preservar restrições Admin/Manager |
| `src/lib/auth/access-destination.ts` | resolver PAP_MANAGER sem dashboard global e UNIT_ADMIN com shell correto; não forçar clinical grants |
| `prisma/schema.prisma` e `prisma/migrations/` | NOVAS tabelas LMS por migrations aditivas; NÃO reescrever migrations antigas |

## Componentes e serviços novos sugeridos

```text
src/components/premium/SectionHero.tsx
src/components/premium/ProfileCard.tsx
src/components/premium/HelpCard.tsx
src/components/premium/Avatar.tsx
src/components/courses/CourseCard.tsx
src/components/courses/CourseCatalog.tsx
src/components/courses/CourseFilters.tsx
src/components/courses/CourseDeadline.tsx
src/components/courses/CourseProgress.tsx
src/components/courses/CourseEmptyState.tsx
src/components/courses/CourseEditor.tsx
src/components/courses/CourseAudiencePicker.tsx
src/components/courses/AssignmentDrawer.tsx
src/components/courses/LearningPlayer.tsx
src/components/courses/LessonBlockRenderer.tsx
src/server/courses/course.service.ts
src/server/courses/publication.service.ts
src/server/courses/assignment.service.ts
src/server/courses/progress.service.ts
src/server/courses/assessment.service.ts
src/server/courses/authorization.ts
src/lib/courses/types.ts
src/lib/courses/schema.ts
src/lib/courses/deadline.ts
src/app/(dashboard)/aprender/[enrollmentId]/page.tsx [ou route group protegida equivalente]
src/app/api/courses/... [validar convenção da codebase]
```

**Arquivos sugeridos, não nomes obrigatórios.** Reutilize infraestrutura já existente e evite duplicar bibliotecas de helpers. Não criar CRUD ornamental que não tenha API real.

## Regras de implementação ao longo das rotas

- `SectionHero` usado em layout/server pages sem duplicar H1; título HTML real, SVG `aria-hidden`. Uma arte por seção, sem personagens.
- `CourseCatalog` recebe `CourseViewModel[]` + handlers/URLs autorizados; **NUNCA faz fetch por conta própria para escolher demo/real**. Containers diferentes traduzem DTO demo e API real para view model.
- Admin Manager tem `WorkspaceShell` teal com ações de autoria; Admin Global mantém suas seções e métricas; Unit Admin tem `DashboardShell` clínico, sem bypass IAM.
- Fotos de perfil podem ser fallback iniciais na operação; não criar falsos usuários nem fake endpoint de upload. Se houver suporte existente à imagem, usar após revisão de risco.
- `assets/banners` não devem ser importados como JSON que vira base64 gigante; colocá-los em `public/brand/banners/` após aprovação visual. Não copiar `referencias/*.webp` para `public` indiscriminadamente; são referências de especificação, nem todas são assets finais.
- Curso html: editor visual com JSON blocado; side-by-side preview no admin; player isolado e validação server-side; materiais privados somente se autorizados.

## Performance/UX

- Evitar `router.refresh` em cada scroll/foco; progress autosave com debounce estável e confirmação visível. Prefetch e cache de curso versionado, não expor answers. Imagens otimizadas (`next/image` quando couber, largura/tamanho definidos).
- Dados pesados de progress de 100 membros: paginação server-side com filtros `status`, `deadline`, `name`, sem carregar todas as matrículas de todos os municípios no client.
- Pré-carregar apenas o curso autorizado e etapa visível; sem baixar material das outras instituições.
- Cliente não decide tenant. Seleção de instituição UX não equivale autorização server-side.
