---
name: pap-saude-ui-design
description: Design or refine PAP Saúde Vitrine Premium UI with strict visual fidelity to approved existing screens, minimal clinical dashboard composition, consistent interactions, and responsive Next.js components. Use for any visual redesign, patient summary, agenda, documents, cards, navigation, or flowchart presentation.
---

# PAP Saúde — Premium UI design

## Scope and source of truth
- This is a repository-local Codex skill, not permission to edit production or deploy. Follow the root `AGENTS.md` and existing approved product UX.
- Read `references/resumo-assistencial-aprovado.md` before redesigning the patient summary. Read applicable code and current screenshot evidence in `docs/release/beta1-longitudinal-h23-h28/evidence/`.
- For other screens, inspect existing component implementations and `docs/design/pap-id-v1/`, `docs/protocolos/referencias/` as applicable. Never infer that an illustration licenses new clinical features.
- Official optional methodology reference: https://github.com/openai/plugins/blob/main/plugins/build-web-apps/skills/frontend-app-builder/SKILL.md . This external reference is not installed or executed.

## Workflow
1. **Inventory**: identify target view, component boundaries, accepted visual reference, actual state and content; list exact modules in scope. Confirm requested areas that must remain unchanged.
2. **Visual specification**: write hierarchy of information, layout grid, spacing, tokens, responsive card/table transformation, and interaction states. For a significant redesign, produce a concept and obtain approval before editing.
3. **Implementation**: reuse Tailwind, existing CSS, typography, buttons, Modal, focus/keyboard infrastructure and motion patterns already in the repository. Keep common UI elements consistent instead of designing new variants for each module.
4. **Interaction**: make every CTA functional, with appropriate loading, empty, error, saving, confirmation and dirty-form states; never use decoration instead of a working state.
5. **Visual review**: use the local browser screenshot suite, compare against the approved layout, and fix spacing, line wrapping, overlays and visual hierarchy before calling work complete.
6. **Handoff**: report changed paths, reference screenshots, deviations, limitations and real test status.

## Visual rules
- Palette: PAP Saúde established magenta/pink family (notably #C41469 for PAP-ID), white/light neutral surfaces, sober slate text, restrained semantic status colors. Derive *other* colors and tokens from live project files; do not guess an entire palette.
- Healthcare UI should be calm, legible, focused, and credible; content is more important than badges or decorative gradients.
- Avoid oversized empty cards, repeated clinical warnings, meaningless 'demo' labels, form walls and multiple prominent CTAs within one summary.
- Prefer sparse compact sections with consistent 12/16/24px-like spacing derived from project tokens, rounded cards matching the current UI, and clear typographic hierarchy.
- One dominant action per functional panel; secondary actions in the relevant tab/panel, not administrative edit controls inside the assistential summary.
- Preserve unchanged global page structure, patient header, tabs, sidebar, existing flows unless explicitly requested.
- Avoid blindly copying generated concept data: dates, gestational age, scores, medical claims, names and treatment recommendations must come from actual valid synthetic state, with provenance. If none exists, display an accurate unavailable state.
- Protocols: retain other tabs; only alter requested flowchart. Show complete verified paths from original PDFs, with accessible animated transitions, pan/zoom and reduced-motion fallback. Never fabricate a clinical branch.
- PAP-Gest documents: keep single-first-document presentation and medical records visibility requirements where explicitly scoped; don't change issuance security or persist patient data without authorization.

## Completion gate
Before declaring PASS, open the actual rendered UI at 320/375/390/430/768/1024/1440 px, inspect long names, Android keyboard/scroll if available, light/dark and reduced motion, and run keyboard/contrast/semantics checks. Write real screenshots and test commands; do not claim automated screenshot equality when not measured.
