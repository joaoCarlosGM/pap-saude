# PAP-ID v1.0 — Design de Registro e vinculação por QR Code

**Status:** especificação visual pronta para revisão pelo Codex; **nenhuma alteração de produto ou deploy nesta branch**. Base: commit `0e0a2d816729`. Branch: `feature/pap-id-v1-registro-ux-spec`.

## Inventário dos artefatos
| Ordem | Estado | Especificação | Arquivo de imagem esperado |
|---|---|---|---|
| 01 | Identificação: CPF / Carteirinha PAP / cadastro manual | [01-identificacao-cpf-qr.md](./01-identificacao-cpf-qr.md) | `images/01-identificacao-cpf-qr.png` |
| 02 | Gestante localizada: confirmação documental | [02-validacao-documental.md](./02-validacao-documental.md) | `images/02-validacao-documental.png` |
| 03 | Paciente não localizada: recuperação e cadastro manual | [03-nao-encontrada.md](./03-nao-encontrada.md) | `images/03-nao-encontrada.png` |
| 04 | Identidade confirmada: escolher prontuário ou novo atendimento | [04-validada-acoes.md](./04-validada-acoes.md) | `images/04-validada-acoes.png` |
| 05 | Cartão validado com resumo clínico mínimo | [05-resumo-clinico-expandido.md](./05-resumo-clinico-expandido.md) | `images/05-resumo-clinico-expandido.png` |
| 00 | Referência original fornecida: Registro / Identificação | [00-referencia-original.md](./00-referencia-original.md) | `images/00-referencia-original.png` |

**Importante:** as imagens são capturas/conceitos fornecidos no chat e têm origem binária fora do GitHub. Não considerá-las publicadas até os arquivos `images/*.png` serem efetivamente enviados e verificados. O pacote local de entrega contém os PNGs originais, seus arquivos MD e um script de instalação. Documentação textual nesta branch pode ser utilizada imediatamente; as imagens devem ser adicionadas na sequência.

## Arquitetura e limites
- Não alterar sidebar, cabeçalho, paleta ou steps da Vitrine Premium.
- Reutilizar `src/features/vitrine-premium/views/registro.tsx`, `components/registro/{RegistrationWizard,Stepper}.tsx` e `components/registro/steps/IdentificationStep.tsx`; a Vitrine permanece 100% sintética.
- Implementação operacional real deve ser separada e baseada em `Patient`, `Pregnancy`, `PatientOrganization`, MFA e IAM; Nginx Admin Beta bloqueia rotas clínicas e deve continuar assim.
- Nenhuma credencial secreta, token de QR, CNS real ou dado de paciente real será incluído no repositório.
- Não expor dados clínicos completos na tela de QR. O resumo expandido só pode aparecer **após** confirmação de autorização clínica na instituição.
- CPF/RG não é fator suficiente para liberar prontuário, por ser dado potencialmente conhecido por terceiros.
- Metadados dos três protocolos clínicos não equivalem à homologação de regras clínicas.
- Não mesclar nem implantar na VPS a partir desta branch sem validação funcional, segurança, testes e revisão.

## Fluxo de navegação
`Identificação inicial → QR/CPF → credencial verificada → conferência de identidade → vinculação PAP-Link (se necessário) → acesso autorizado → resumo clínico → [Prontuário | Novo atendimento]`.
`Não encontrada` oferece repetir leitura, novo identificador e cadastro manual com deduplicação.
Todas as telas pertencem ao Stepper **1 de 5**.

## Matriz mínima de testes
1. QR válido/expirado/revogado/copied, fallback câmera, consentimento de câmera.
2. Documento correto/divergente, ausência de documento, enumeração, rate limiting.
3. Enfermeiro da UBS A/B, sem vínculo, MFA pendente, contexto trocado, link repetido; nenhuma duplicidade.
4. Visualização de dados autorizados vs paciente de outra instituição, dados clínicos indisponíveis/antigos, proveniência MEOWS/DPP.
5. Mobile, tablet, desktop, teclado, leitor de tela, contraste AA, estados loading/error.
6. Vitrine Comercial continua demo em memória e não alcança API clínica real.

## Ordem de implementação sugerida
**UX-S1:** adaptar IdentificaçãoStep demo (estados visuais, busca sintética).
**UX-S2:** cartões encontrada/não-encontrada/validada (fluxo de navegação).
**UX-S3:** cartão expandido de dados clínicos com fixtures falsas e estados ausentes.
**OP-S1:** construir backend PAP-ID/PAP-Link e teste isolamento institucional antes de consumir dados reais.
**OP-S2:** conectar tela operacional a APIs com permissões por paciente/UBS.

Observação: cores/medidas presentes nos arquivos de detalhe são alvos aproximados derivados das telas; priorizar a base CSS/Tailwind real do repositório.
