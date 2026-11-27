# PAP SAÚDE 2 — MISSÃO CODEX PAP-B1-UX-04
## H38–H42 + H43 Agenda | Vitrine Imersiva, Registro Premium e Fluxogramas PAP

**Este documento contém a missão de execução. É documentação, não execução automática.** Implementar em branch exclusiva criada a partir da branch de documentação, sem deploy ou merge.

**Repositório:** `joaoCarlosGM/pap-saude`
**Branch-base que contém as skills/docs:** `feature/beta1-ux-final-h29-h37-rc`; conferir **HEAD remoto atualizado** antes de executar (o SHA anterior ao contrato era `af79307cab705264d38cb971bd67c1058efbca25`).
**Branch-alvo de implementação:** `feature/beta1-immersive-ux-h38-h43-rc`.

## 0. Inventário, não improvisar
1. Conferir checkout/branch/HEAD/status, `AGENTS.md`, docs Next.js instaladas, componentes atuais, evidências H29–H37 e política de laboratório privado.
2. Ler integralmente, **nesta ordem**:
   - `docs/release/beta1-immersive-ux-h38-h42/CONTRATO-VISUAL-APROVADO.md`
   - `docs/release/beta1-immersive-ux-h38-h42/REGISTRO-ETAPAS-2-3-4.md`

   - `docs/release/beta1-immersive-ux-h38-h42/REGISTRO-CONCEPT-DEFINITIVO-UI-UX.md` — **contrato visual mais detalhado das Etapas 2, 3 e 4; leitura prioritária e obrigatória**.
   - **PRIORIDADE MÁXIMA PARA UI/UX DO REGISTRO:** `docs/release/beta1-immersive-ux-h38-h42/REGISTRO-FIDELIDADE-VISUAL-CONCEPTS-APROVADOS.md`. Este é o contrato comparado diretamente às três imagens; em diferenças de composição visual, este prevalece sobre os contratos genéricos, preservando todos os campos da branch. Não declarar PASS visual sem screenshots lado a lado com as imagens originais.
   - `docs/release/beta1-immersive-ux-h38-h42/FLUXOGRAMAS-CONSTRUCAO-PROGRESSIVA.md`
   - `docs/release/beta1-immersive-ux-h38-h42/AGENDA-THUMBNAIL-E-UI.md`
   - `docs/release/beta1-immersive-ux-h38-h42/CHECKLIST-VISUAL-E-REGRESSAO.md`
3. Ativar e aplicar `.agents/skills/pap-saude-concept-fidelity/SKILL.md`, `pap-saude-registration-ux/SKILL.md`, `pap-saude-flow-reveal/SKILL.md`, e as skills preexistentes `pap-saude-ui-design`, `pap-saude-visual-qa`, `pap-saude-clinical-ux`.
4. Ler todos os campos `RegistrationData` e os componentes `PregnancyStep`, `VitalSignsStep`, `ObstetricStep`, `ClinicalHistory`, `RecordFields`, `SoapNotes`, `RegistrationWizard`, cálculo MEOWS e fontes dos protocolos.
5. Capturar baseline. As imagens concept aprovadas foram compartilhadas na conversa do operador e podem precisar ser anexadas ao ambiente Codex. **Se estiverem ausentes, usar o contrato textual e informar que pixel match está pendente; não criar outro concept nem alegar igualdade com imagem não acessada.**
6. Criar matriz ATUAL → APROVADO → MODIFICADO → TESTADO e declarar o arquivo/área exata. Mudanças externas ao escopo são proibidas, exceto adaptação técnica estritamente necessária e documentada.

## 1. Missões
**H38 — Vitrine imersiva:** usar pacientes fictícias completas, rastreáveis e dinamicamente coerentes no calendário; acesso de apresentação a artefatos sintéticos que NÃO dependam de login no laboratório privado; não expor PDFs/QR/PII reais ou controles operacionais. Retirar avisos *repetidos* de demo/não homologado dos cards, mantendo identificação geral de cenário fictício e informações obrigatórias de procedência fora da superfície comercial. Não usar valores hardcoded que pareçam clínicos.

**H39 — Datação dinâmica e múltiplas fontes:** remover uso de `DEMO_DATE` como data atual de IG/DUM; preservar histórico e distinguir momento do atendimento; DUM, ultrassom/exame e DPP conhecida com origem/evidência. Testar 24/07/2026 → 28/10/2026 IG 13s5d; 25/11/2026 IG 17s5d; DPP 30/04/2027. Não alterar critério clínico de datação sem revisão.

**H40 — Registro Premium etapas 2, 3, 4:** implementar exatamente a hierarquia visual fechada e **todos** os contratos existentes da matriz; preservar primeiro atendimento, DUM desconhecida, O₂/fluxo, consciência, débito urinário, proteinúria método+laboratório, edema condicional, SOAP S/O/A/P, alergias, medicamentos, comorbidades, antecedentes G/P/C/perdas. Os campos da arte que não existem (`glicemia capilar, dor EVA, alto risco, gêmeos, unidade`) **não devem ser inventados**. Reaproveitar botões, animações, progressão e componentes UI. Testar persistência e resumo final.

**H41 — MEOWS integrado:** a Vitrine pode apresentar cálculo completo com casos fictícios coerentes. Conectar painel ao algoritmo versionado atual `calculateDemoMeows` e avaliações completas registradas; **não alterar limiares**, não contar SatO₂/débito/proteinúria como score sem regra existente. Estado incompleto não é score 0. Linha temporal real dos atendimentos fictícios, sem tendência inventada. A autorização do usuário para a demonstração não elimina a necessidade de revisão clínica antes do uso operacional.

**H42 — Fluxogramas com construção progressiva:** os três fluxos documentais completos, estrutura/arestas/falhas de fidelidade da H36 resolvidas ou `BLOCKED` com evidência; cores da PAP em vez das cores dos PDFs; sequência progressiva de nós/conexões, pausar/reiniciar/ver completo/zoom/pan/tela cheia, modo reduced-motion. Não transformar a leitura em prescrição automática. Protocolo PDF imutável e acessível. Não redesenhar Visão Geral ou Checklist.

**H43 — Agenda banner/thumbnail padrão**: corrigir `RouteHero.sections` adicionando `agenda:["Agenda","agenda"]`, criar `public/brand/banners/agenda.svg` a partir de `atendimentos.svg` em `960×220`, rx20, mesmas ondas/degradê/rosa institucional, **ícone calendário** no lugar do existente, reutilizar `SectionHero`. Não alterar filtros, listagem, modal nem rotas da agenda. Comparar em imagem com Registro/Atendimentos. Este é um acréscimo pontual ao escopo da rodada, não autorização para redesign da Agenda.

## 2. Design visual mandatário
- Reusar tokens e padrões existentes. Card principal branco com borda cinza 1px raio 16, padding desktop 20–24/mobile16. Inputs ≥44px, raio 8–10, label acima. Ícones Lucide existentes em quadrados rosa claro 48–56px, botão primário `#C41469`, borda suave, gap 16–20.
- Stepper e shell existentes intocados; seções e campos na ordem dos documentos.
- Títulos, badges, calendário, gráficos e estados preenchidos usam fonte de verdade; dados da imagem somente ilustram aparência.
- Entregas visualmente idênticas à composição aprovada, NÃO novos concepts.

## 3. Segurança e testes obrigatórios
- Sem mudanças em `prod`, `PROD`, `develop`, VPS, DNS, Nginx, IAM/MFA, migrations operacionais, banco 15436 ou UI 3600. Usar laboratório privado novo com nomes/volumes/portas próprios e dados exclusivamente sintéticos.
- Conservar PDF/QR e emissão/revogação PAP-Gest por autorização adequada; nova leitura de apresentação *somente* com dados sintéticos e assets não sensíveis.
- Executar testes unitários, MEOWS, datação, boundary de produção, TS, lint, build, integração PostgreSQL isolada, Playwright 320/375/390/430/768/1024/1440, keyboard/reduced motion, acesso de duas pacientes, resumos e trends, agenda, 3 fluxogramas.
- Verificar cada campo original por selector e ida/volta do wizard, novas fontes da datação e persistência.
- Para cada item `PASS/FAIL/BLOCKED/NOT RUN`, incluir log/comando/screenshot sem PII/token e hash do commit. Comparação visual exata com imagem da conversa só é PASS quando houve acesso à imagem.

## 4. Entrega
Criar `docs/release/beta1-immersive-ux-h38-h43-implementation/` com:
`RELATORIO.md`, `MATRIZ-CAMPOS.md`, `CONTRATO-VISUAL-EXECUTADO.md`, `MATRIZ-FLUXOGRAMAS-PDF.md`, `CHECKLIST-RESULTADOS.md`, `HOMOLOGACAO-WSL.md`, `HOMOLOGACAO-MOBILE.md`, `SEGURANCA.md` e `evidence/` com imagens do antes e depois e frames da construção.

Fazer commit/push **somente da nova branch de implementação**, confirmar SHA remoto, relatar pendências e instruir homologação no WSL. **Sem merge ou deploy**. Ao concluir, aguardar aceite do operador.
