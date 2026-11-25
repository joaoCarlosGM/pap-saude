---
name: pap-saude-visual-qa
description: Review and verify PAP Saúde UI implementations with real browser screenshots, responsive regression checks, keyboard accessibility, overlays, modal behavior, and comparison to approved screen references. Use after any frontend edit or when user says UI is cluttered, misaligned, hidden, or unresponsive.
---

# PAP Saúde — visual QA and interaction review

## Required setup
- Read root `AGENTS.md`, task acceptance docs, screenshot/visual references, existing test harness before running anything.
- Use only a disposable, isolated review-lab profile for functional testing. Never touch running operator containers, UI port 3600, DB 15436, VPS, production or clinical data. Never run docker prune.
- Prefer existing Playwright/Chromium harness under `tests/pap-id` and `tests/protocols`. Do not add a second browser framework or dependencies without reason.
- External official guidance (read-only): https://github.com/openai/plugins/blob/main/plugins/build-web-apps/skills/frontend-testing-debugging/SKILL.md

## Visual inspection sequence
1. Capture baseline before change and after change, same URL, viewport, state, theme and data.
2. Check at 320, 375, 390, 430, 768, 1024 and 1440px. At 375/390, inspect overflow and scrollbar, viewport zoom, keyboard overlap, fixed menu overlap, readable buttons and labels.
3. Validate the visual system: page shell unchanged when out of scope, measured spacing, typography, color/contrast, concise states, meaningful iconography, one dominant action.
4. Check each form: opening, form state, invalid values, save, server validation, error focus, scroll-to-error, discard, confirmation and close, focus restore.
5. Check modal behavior: no unsolicited modal after navigation, accessible labels, Escape/backdrop semantics, no contradictory footer close buttons, dirty-form confirmation immediately visible, scroll restoration and no body scroll bleed.
6. Check content semantics: timestamps/units not invented, "não avaliado" distinct from zero or normal, no fictitious MEOWS plot, no fake clinical alerts, no inferred document/vaccination status.
7. Run unit + integration/Playwright + TS/lint/build/boundary as applicable. Report first-run failures and subsequent reruns separately; do not silently hide flakiness.

## Evidence and handoff
- Provide real screenshots for desktop + mobile, pre/post where possible; sanitize QR/token/PII.
- Mark each observed check PASS, FAIL, BLOCKED, NOT RUN. Physical device testing cannot be PASS based on emulation alone.
- Produce a short delta report with exact components changed, regressions checked, visual issues remaining, and explicit no-deploy status.

## Triggers to pay attention to
- New patient summary/calendar layout: compare against `../pap-saude-ui-design/references/resumo-assistencial-aprovado.md`.
- Edema: when grade is absent/not evaluated, hide location; show location only for affirmative grades.
- SOAP: profile author must be taken from authenticated context in operational environment. A demo selection must never be represented as signing on behalf of another professional.
- Exam modal: a discard prompt must be within view, close on confirmed discard, and scroll/focus errors into view.
- Protocol flowchart: completeness requires checking actual PDFs and branches, with animation accessibility and reduced motion.
- PAP-Gest: auto-issue on successful synthetic registration only if supported by secure private review contract; first document in list, same visual language as other documents.
