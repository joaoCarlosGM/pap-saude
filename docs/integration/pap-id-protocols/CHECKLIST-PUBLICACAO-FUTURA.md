# Publicação futura da Vitrine — checklist, NÃO AUTORIZAÇÃO DE DEPLOY

- [ ] Aceite visual/funcional conjunto do operador, registrando SHA e divergências.
- [ ] Autorização institucional verificável para disponibilizar/redistribuir cada PDF;
      esclarecer códigos/paginação de sepse e confirmar aplicabilidade com revisor responsável.
- [ ] Projetar armazenamento privado de versões e endpoints reais de stream/download com
      sessão, MFA, commercial.read/escopo aprovado, rate limiting e auditoria sem tokens/PII.
- [ ] Não promover `/homologacao/*`, cookie técnico, JSON de testes ou CLI de emissão a produção.
      Variável de ambiente não deve transformar a fixture em endpoint operacional.
- [ ] Preservar negações clínicas/LMS conforme deployment; atualizar Next/Nginx em conjunto com
      rotas/métodos explícitos quando aprovados, sem liberar indiscriminadamente prefixos.
- [ ] Confirmar checksum/assinatura/metadata dos originais imutáveis; revisão do conteúdo
      estruturado antes de condutas, medicamentos, doses ou checklists assistenciais.
- [ ] Revisar dependências e licenças/avisos PDF.js; tratar riscos herdados conforme gate vigente.
- [ ] CI integral no SHA exato, imagens/scanners e smoke Docker em recursos descartáveis;
      nenhum resultado local substitui estes gates. Não publicar tags imutáveis já utilizadas.
- [ ] Verificar artefato standalone sem .local/.env, carteirinhas ou originais restritos;
      manter testes de negação HTTP/RSC/API e ausência de acesso a dados reais.
- [ ] Plano de release/reversão operacional, preservação de volume/contas/MFA, backup testado
      para o destino e aprovação explícita de publicação da implantação isolada.

VPS/DNS/SSH, GHCR, Nginx, branches prod/PROD/develop e workflows não foram alterados.
Não executar etapas B/C automaticamente após esta entrega. Produção: NO-GO.
