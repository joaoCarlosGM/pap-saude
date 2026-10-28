# MISSÃO — PAP Saúde PROD | Refinamento funcional da Vitrine

## 1. Contexto

Repositório: `joaoCarlosGM/pap-saude`

Branch de referência: `prod`

Commit analisado: `40896212cb01e35fb6b204f6226b8d28ba1f6d1b`

Criar branch de trabalho:

`feature/prod-vitrine-ui-refresh`

Destino do Pull Request: `prod`.

O operador aprovou expressamente a interface da `prod`. Sua aparência atual será utilizada como referência principal da futura Vitrine Comercial.

**MISSÃO: corrigir inconsistências funcionais e aprimorar a experiência demonstrativa sem modificar a identidade visual aprovada.**

Trabalhe de maneira autônoma até concluir a implementação, executar os testes e abrir um PR. Não solicite aprovações intermediárias para cada arquivo.

---

## 2. REGRA ABSOLUTA — PRESERVAÇÃO VISUAL

NÃO redesenhar a aplicação.

Preservar:

- Cores atuais, incluindo rosa, verde-petróleo e fundo claro.
- Sidebar branca, organização e ordem dos módulos.
- Topbar verde-petróleo.
- Dashboard com oito cartões e disposição atual.
- Gráficos, cartões, modais, tipografia, espaçamentos e bordas existentes.
- Layout das listas, tabelas e fichas de pacientes.
- As cinco etapas atuais do Registro.
- Navegação principal e nomes das rotas.
- Estilo dos componentes e estrutura das páginas.

**Não substituir os componentes atuais por outra biblioteca de UI.**

São permitidas somente alterações visuais estritamente necessárias para:

1. Adicionar campos e subseções ao Registro, utilizando os componentes e padrões existentes.
2. Exibir pequenos indicadores de “Dados demonstrativos” ou “Simulação” quando necessários.
3. Corrigir comportamentos quebrados, estados vazios, acessibilidade e overflow mobile.
4. Animar o ícone Chat IA.
5. Exibir validações, notificações e estados de ações.

Antes de modificar componentes, gerar evidências visuais da versão original em desktop e mobile para comparar os resultados.

Se alguma melhoria exigir alterar o desenho geral de uma página, não faça essa mudança: preserve o layout e registre a limitação no relatório.

---

## 3. LIMITES DE ARQUITETURA E SEGURANÇA

Esta missão atua exclusivamente na aplicação demonstrativa da `prod`.

- Não importar a implementação do P0 para esta branch.
- Não realizar merge de `develop`, branches de homologação ou branches Codex anteriores.
- Não modificar o banco PostgreSQL, Prisma Schema, migrations ou arquivos de configuração de ambientes.
- Não modificar Dockerfile, workflow CI/CD, scripts de deploy, SSH ou VPS.
- Não criar autenticação fictícia apresentada como segurança real.
- Não conectar sistemas DATASUS, RNDS ou outras APIs clínicas.
- Não adicionar serviços externos de IA.
- Não utilizar dados reais de pacientes.
- Não habilitar operações clínicas em produção.

Todos os pacientes, atendimentos e registros utilizados nesta versão devem ser explicitamente sintéticos.

O Chat IA continuará demonstrativo.

A aplicação deve funcionar como uma apresentação interativa coerente do produto, não como prontuário clínico de produção.

---

## 4. BLOCO A — Unificar os dados mockados

Problema: Dashboard, Pacientes, Atendimentos e Prontuário utilizam estruturas independentes.

Criar uma camada tipada e centralizada de dados sintéticos.

Arquivos existentes como referência:

- `src/lib/mock-dashboard.ts`
- `src/lib/mock-pacientes.ts`
- `src/lib/mock-atendimentos.ts`
- `src/types/paciente.ts`
- `src/types/atendimento.ts`
- `src/types/dashboard.ts`

Requisitos:

1. Utilizar identificadores estáveis e compartilhados de pacientes e atendimentos.
2. Eliminar discrepâncias de nome, idade gestacional, DUM, DPP e histórico.
3. Garantir que Dashboard, Pacientes e Atendimentos derivem informações do mesmo conjunto de registros.
4. Garantir que números de consultas e históricos sejam coerentes.
5. Calcular indicadores demonstrativos a partir dos dados disponíveis, em vez de manter valores contraditórios.
6. Corrigir as datas ultrapassadas exibidas como futuras.
7. Permitir que uma paciente presente nos atendimentos seja localizada em sua ficha.
8. Não misturar dados gerados na demonstração com qualquer fonte clínica real.

Preservar a aparência dos oito indicadores do Dashboard. Os valores podem ser ajustados ou as fixtures ampliadas para manter a consistência matemática.

Preferir fixtures determinísticas. Evitar informações que mudem aleatoriamente a cada renderização.

Se for necessário gerar mais registros para sustentar os KPIs, utilizar dados inteiramente fictícios e manter a navegação eficiente.

---

## 5. BLOCO B — Corrigir o fluxo de Registro

Manter as cinco etapas existentes:

1. Identificação
2. Gestação
3. Sinais Vitais
4. Dados Obstétricos
5. Resultado

Não criar uma nova identidade visual nem outro wizard.

### B1 — Identificação

- Validar os campos obrigatórios.
- Impedir avanço com dados essenciais inválidos.
- Remover a afirmação automática “CPF não encontrado no DataSUS” antes de qualquer consulta.
- Identificar explicitamente que a busca na demonstração é simulada.
- Permitir localizar uma paciente na base sintética e recuperar seus dados.
- Permitir iniciar um cadastro sintético novo.
- Evitar duplicidade de paciente por identificador dentro da demonstração.

### B2 — Histórico clínico

Adicionar aos formulários existentes, preferencialmente como subseções do bloco Dados Obstétricos e Clínicos:

**Alergias**

- Investigado: sim/não/desconhecido.
- Substância ou agente.
- Reação relatada.
- Observações pertinentes.
- Possibilidade de adicionar múltiplos registros.

**Medicações em uso**

- Medicamento.
- Dose.
- Frequência.
- Via.
- Possibilidade de adicionar/remover entradas demonstrativas.

**Comorbidades**

- Presença conhecida ou informação desconhecida.
- Lista de condições relatadas.
- Possibilidade de múltiplos registros.

**Antecedentes obstétricos**

- Número de gestações.
- Partos.
- Cesáreas.
- Perdas gestacionais, utilizando terminologia clínica apropriada.
- Campos adicionais pertinentes à apresentação demonstrativa.

Não impor respostas clínicas padrão. Informação não preenchida deve permanecer desconhecida, não automaticamente negativa.

### B3 — Gestação e sinais vitais

- Corrigir comportamento de DUM vazia.
- Validar datas futuras ou inconsistentes.
- Calcular IG/DPP de forma coerente quando houver dados adequados.
- Permitir indicar DUM desconhecida, sem inventar uma data.
- Adicionar validações de entrada para sinais vitais.
- Impedir valores fisicamente impossíveis.
- Distinguir dado ausente de resultado normal.
- Permitir registrar dados não aferidos sem criar uma falsa medição.
- Validar coerência entre pressão sistólica e diastólica.

### B4 — Resultado e conclusão

O arquivo `src/lib/meows.ts` ainda não implementa o protocolo MEOWS e retorna zero.

**Não apresentar zero como resultado clínico calculado.**

Enquanto não houver uma regra validada:

- Exibir “Avaliação MEOWS não disponível nesta demonstração”.
- Não gerar classificação clínica ou conduta automática.
- Preservar o desenho dos cartões existentes, adaptando somente o conteúdo necessário.
- Permitir revisar as informações preenchidas.
- Acrescentar registro demonstrativo de observações, encaminhamento e desfecho, sem recomendações automáticas.
- Implementar um salvamento demonstrativo com feedback explícito.

Nenhuma regra clínica real deve ser inventada ou implementada sem protocolo aprovado.

### B5 — Integração demonstrativa

Ao concluir um Registro:

- Criar ou atualizar a paciente no estado demonstrativo.
- Criar um atendimento vinculado ao ID correto.
- Exibir o atendimento no histórico.
- Atualizar as informações pertinentes da ficha.
- Refletir o novo registro nos indicadores aplicáveis.

Utilizar gerenciamento de estado local tipado. Persistência local opcional, somente para dados sintéticos, com mecanismo para restaurar a demonstração.

Não usar banco real ou API clínica.

---

## 6. BLOCO C — Prontuário coerente

Preservar integralmente o layout das abas:

- Resumo
- Timeline
- Observações Anteriores
- Evolução
- Exames
- Vacinação
- Medicações
- Documentos

Corrigir:

1. Alergias precisam corresponder às informações presentes no cadastro.
2. Medicações precisam corresponder ao histórico registrado.
3. Comorbidades e histórico obstétrico precisam ter origem identificável.
4. Consultas e avaliações devem referenciar atendimentos existentes.
5. O histórico deve apresentar datas verdadeiras das fixtures e profissionais correspondentes.
6. Não apresentar todos os profissionais como Ana Paula.
7. Gráficos devem utilizar registros coerentes com a tabela.
8. A aba Vacinação deve respeitar os estados `APLICADA` e `PENDENTE`.
9. Documentos e exames devem ser claramente demonstrativos.
10. Estados vazios devem ser explícitos e bem apresentados.

Não inventar resultados laboratoriais ou classificações de risco como consequência de preenchimentos recém-realizados.

---

## 7. BLOCO D — Atendimentos e Dashboard

### Atendimentos

Tornar funcionais:

- Busca por nome.
- Filtro por período.
- Filtro por classificação, quando houver classificação demonstrativa disponível.
- Filtro por profissional.
- Contagem de resultados.
- Navegação para a paciente correspondente.

Os filtros devem funcionar juntos.

Corrigir o botão “Resumo IA”: ele não pode aparentar uma integração existente. Utilizar um modal demonstrativo identificado ou um estado informativo de indisponibilidade.

### Dashboard

Preservar os oito KPIs e a estrutura original.

Garantir consistência entre:

- Pacientes cadastradas.
- Atendimentos.
- Histórico.
- Gráficos.
- Classificações demonstrativas.
- Datas prováveis de parto.
- Indicadores derivados.

Quando um dado não puder ser calculado coerentemente, indicar indisponibilidade ou natureza ilustrativa, em vez de inventar valores.

---

## 8. BLOCO E — Protocolos, Cursos, Ferramentas e Configurações

Corrigir interações que parecem funcionais, mas não executam uma ação.

**Protocolos**

- Busca deve continuar funcionando.
- Modal deve indicar claramente quando um documento não está disponível.
- Upload/download não podem sugerir sucesso sem efetivamente realizar uma operação demonstrativa.
- Manter o layout dos cartões.

**Cursos**

- Manter catálogo e progresso ilustrativos.
- Não simular reprodução real de aula inexistente.
- Identificar player demonstrativo.

**Ferramentas**

- Preservar a calculadora gestacional.
- Corrigir validação de datas.
- Demais ferramentas permanecem indicadas como futuras.
- Não implementar cálculos clínicos avançados sem validação.

**Configurações**

- Identificar claramente as informações demonstrativas.
- Não fingir alterações reais de senha, MFA ou sessões.
- Preferências visuais devem ter efeito real na interface ou ser identificadas como indisponíveis.
- Se implementada confirmação de saída do Registro, integrá-la ao estado de preenchimento.

Evitar botões sem resposta.

---

## 9. BLOCO F — Chat IA

Manter a interface atual do Chat IA.

Não conectar um modelo de IA nesta missão.

### Animação obrigatória

Implementar um ícone reutilizável contendo:

- Robô atual da biblioteca Lucide.
- Três pequenas estrelas ao redor.
- Animação suave, elegante e discreta.
- Movimento periódico, não excessivo.
- Integração no item Chat IA da Sidebar.
- Integração no estado inicial do Chat IA.

Usar CSS ou solução leve já disponível.

Não instalar biblioteca pesada de animação.

Respeitar `prefers-reduced-motion`.

Evitar qualquer efeito visual que modifique a largura da Sidebar, altura dos itens ou alinhamento do menu.

Manter as respostas do Chat claramente identificadas como simulação.

---

## 10. BLOCO G — Responsividade, UX e acessibilidade

Preservar o design desktop aprovado.

Verificar pelo menos estas larguras:

- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- 1440 px

Critérios:

- Sem scroll horizontal inesperado da página.
- Sidebar mobile funcionando como drawer.
- Conteúdo não comprimido por uma sidebar invisível.
- Cabeçalho legível.
- Cards responsivos.
- Formulários utilizáveis por toque.
- Modais utilizáveis no celular.
- Labels e mensagens de erro acessíveis.
- Foco de teclado visível.
- Estados de carregamento, sucesso e falha coerentes.
- Animações reduzidas para usuários que preferem menos movimento.

Não fazer redesign para resolver um erro responsivo.

---

## 11. TESTES OBRIGATÓRIOS

Implementar testes direcionados para os novos contratos.

### Dados sintéticos

- Identificadores compartilhados.
- Consistência entre Dashboard, pacientes e atendimentos.
- Datas gestacionais coerentes.
- Cálculo de indicadores.
- Ausência de duplicidade.

### Registro

- Validação de campos.
- Alergias múltiplas.
- Medicações múltiplas.
- Comorbidades.
- Histórico obstétrico.
- DUM inválida ou ausente.
- Sinais vitais fora de limites plausíveis.
- Fluxo completo de Registro demonstrativo.
- Atualização do histórico.
- Ausência de score clínico inventado.

### Interface

- Filtros de atendimentos.
- Navegação para prontuário.
- Modal de documentos.
- Estados demonstrativos.
- Responsividade.
- Chat IA identificado como simulação.

Executar:

`npm run lint`

`npm run build`

E os testes adicionados ou existentes pertinentes.

Verificar o funcionamento real no navegador, não apenas a compilação.

Comparar capturas visuais antes/depois das páginas principais.

Não corrigir falhas de infraestrutura alterando proteções ou desabilitando verificações.

---

## 12. GIT, COMMITS E PULL REQUEST

Fluxo obrigatório:

1. Confirmar o SHA atual de `origin/prod`.
2. Criar `feature/prod-vitrine-ui-refresh` a partir do HEAD atual de `prod`.
3. Preservar mudanças locais não relacionadas, caso existam.
4. Separar commits por blocos funcionais.
5. Validar cada bloco com testes direcionados.
6. Fazer push da branch de feature.
7. Executar validações completas.
8. Abrir um único Pull Request para `prod`.
9. Conferir o CI do PR.
10. Entregar o link do PR e resumo das alterações.

Sugestões de commits:

- `refactor(demo): centralize coherent synthetic clinical data`
- `feat(demo): complete registration history and validation`
- `fix(demo): synchronize records dashboard and patient views`
- `fix(demo): complete interactions and demo disclosures`
- `feat(ui): animate chat ai icon and refine mobile behavior`
- `test(demo): cover registration and data consistency`

Não utilizar `git add .` indiscriminadamente.

**PROIBIDO:**

- Merge automático.
- Push direto para `prod`.
- Deploy manual.
- Alterações na VPS.
- Alterações de banco de dados.
- Modificação de credenciais ou workflows de implantação.

O workflow existente pode executar testes no PR. A publicação acontecerá somente quando o operador aprovar e realizar o merge.

---

## 13. CRITÉRIOS DE ACEITE

A missão somente estará concluída quando:

- O design aprovado estiver preservado.
- As 25 inconsistências identificadas estiverem corrigidas ou explicitamente documentadas como não aplicáveis à demonstração.
- O Registro permitir informar alergias, medicações, comorbidades e histórico obstétrico.
- Dashboard, pacientes e atendimentos utilizarem registros demonstrativos coerentes.
- O salvamento demonstrativo atualizar as visualizações pertinentes.
- Nenhuma avaliação MEOWS não validada for apresentada como resultado real.
- Nenhuma integração externa inexistente for apresentada como funcional.
- O Chat IA possuir animação discreta com acessibilidade.
- O mobile estiver utilizável.
- Lint, build e testes pertinentes passarem.
- O PR estiver aberto contra `prod`, sem merge e sem deploy.

Entregar relatório contendo:

1. URL do Pull Request.
2. Branch e SHA final.
3. Arquivos modificados.
4. Correções por bloco.
5. Testes executados e resultados.
6. Evidências de preservação visual.
7. Limitações remanescentes.
8. Confirmação de que VPS, P0, bancos e infraestrutura não foram modificados.

**PRINCÍPIO FINAL: melhorar a coerência da demonstração sem perder absolutamente nada da experiência visual aprovada.**