---
name: pap-saude-clinical-ux
description: Build safe, concise and auditable data-entry flows for PAP Saúde patient charts, including SOAP, examination results, edema, medications, allergies, vaccines, appointments and document links. Use whenever changing healthcare-related forms, clinical labels, patient summary, risk charts or longitudinal data flows.
---

# PAP Saúde — clinical records UX

## Always read first
- Root `AGENTS.md`, current H18–H28 requirements and clinical boundaries.
- `src/features/vitrine-premium/types/paciente.ts`, `types/registration.ts`, `lib/registration-record.ts` and relevant source component before altering fields.
- Existing private review authorization/persistence contracts when storing clinical-like synthetic data.

## Clinical-form design rules
1. Use the minimum fields necessary on the initial surface, reveal optional fields conditionally; never fill the screen with long administrative forms. Preserve simple concise labels in Portuguese.
2. Proteinúria: “Não realizado” is **not** “Negativa”; measurement method and units stay with result. Never conflate strip test with 24h lab protein.
3. Edema: “Ausente” and “Não avaliado” hide all **localização** checkboxes/inputs, clear misleading hidden values or explicitly preserve as draft without persisting stale location; show locations only for 1+/4+ through 4+/4+. Never derive hypertension diagnosis from edema.
4. SOAP: S=Subjetivo, O=Objetivo, A=Avaliação, P=Plano; small accessible help text. Real author is session-authenticated user, not chosen from dropdown; demonstrative fixtures are not clinical signatures. Preserve provenance, date/time, professional category and immutable event history. Do not invent an author.
5. Modals: if discard confirmed, close; for dirty forms show visible confirmation at current scroll position with focus trapped as appropriate. Scroll error into view and focus it. Clear saved/invalid state accurately.
6. Exames/vacinas/medicações/alergias: edits and correction must preserve version/history and patient scope. An uploaded PDF is an attachment, not automatic structured clinical interpretation. No fabricated lab result, immunization dose, treatment or risk.
7. Calendar and upcoming care: separate planned vs completed vs cancelled vs synthetic example; no implicit appointment scheduling or action without user consent. Data sources and as-of date accurate.
8. MEOWS: real calculation must derive only from documented values and homologated algorithm. Score 0 is a valid measured value only with a genuine complete evaluation, never a default. Missing trend = empty state. Do not generate clinical treatment recommendation from demonstration classifications.
9. Alerts: expose meaning/source/category and distinguish platform notifications from clinical flags; don't show fictional count as real risk.
10. PAP-Gest: name approved; automatic issuance should occur only after a successfully committed patient registration, inside permitted private fixture, with idempotent retry, active token security, and no raw identity data in QR. Render first in Documents with PAP-brand colored icon and existing list card UX. Failure must be visible/retryable, never silently declare issuance.
11. Patient data: no data loss when a follow-up consultation omits a previously known medication/allergy/condition. “Not recorded” is not “none.” Strong identification edits require controlled correction; keep the private patient/QR links intact.
12. Protocol diagrams: only source-backed branches with exact provenance from PDFs, reviewer sign-off when clinical inferences are involved. Motion/zoom cannot substitute for clinical completeness.

## Completion
- Prove both data behavior and UI behavior by test. Test empty/unknown, populated, long text, failed save, retries, corrections, two patients, refresh/restart, mobile keyboard and accessibility. Avoid clinical claims that are not supported by the source.
- No real patient information; no operational deployment or production access.
