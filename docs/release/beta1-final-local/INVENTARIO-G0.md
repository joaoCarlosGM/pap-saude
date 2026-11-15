# Inventário inicial — preservar e completar

Funciona na base: fila múltipla PNG/código, CPF/RG e cinco etapas; três pessoas iniciais;
emissão/reemissão/revogação com transação/índice/chave idempotente; leitor privado dos PDFs
originais e conteúdo documental citado; consultas sem exposição no standalone.

Faltava: cadastrar outras pessoas no PostgreSQL; guardar a imagem da credencial de forma
recuperável após restart, sem token bruto em repouso; anexos PDF privados por pessoa, versões e
auditoria demonstrativa; câmera real; ingresso HTTPS autenticado pelo celular; visual de
Protocolos mais próximo das referências, controles completos da figura e evidências de animações.

Reutilizar CardServiceContext, DemoProvider, PatientTabs/Documents, Modal, OriginalPdfViewer,
jsQR, qrcode, PDF.js e pg existentes. Não adicionar biblioteca ou reescrever autenticação.
Banco: namespace review_* exclusivo, SQL aditivo próprio, sem Prisma/migrations operacionais.
Credenciais de cartão recuperáveis serão cifradas em repouso, com chave local fora do banco/Git.

V1: git diff0e0a2d8 para motion, DashboardShell, dashboard e src/components/premium está vazio.
A fixture usa o mesmo PremiumShell, CSS/tokens e fontes locais; medir a execução no navegador
antes de decidir qualquer mudança. Conceitos incluem conteúdo/CTAs clínicos não homologados:
reproduzir hierarquia/elementos visuais, não doses ou botão “Usar no atendimento”.

Origem/HEAD anteriores preservados; worktrees antigas de/tmp já estavam ausentes, sem prune ou
recriação. Laboratórios3600/15436, contas/MFA, Admin/Comercial/LMS, Nginx e VPS não acessados.
