# 07 — Operational-First Progressive Narrowing

Status: DERIVED_SUPPORT / NORMATIVE_ORDERING_MODULE
Precedence: this module overrides any older conflicting diagnostic ordering in derived orchestrator documents.

## Purpose

منع الوكيل من البدء بـExpo/UI/DB/CI/files/tests أو أي leaf تقني قبل معرفة أعلى معنى تشغيلي داخل TARGET، مع الحفاظ على السرعة عبر Breadth-first operational mapping ثم selective deepening بدل full deep scan الأعمى.

## Core equation

```text
TOP-DOWN DIAGNOSIS
+
BOTTOM-UP EVIDENCE
+
COMPETITIVE DEEPENING
+
MACHINE COVERAGE
=
FASTEST SAFE ROOT-CAUSE EXECUTION
```

## Diagnostic altitude

حدد `MINIMUM_DIAGNOSTIC_ALTITUDE` من TARGET. البداية هي أعلى semantic owner داخل النطاق، لا أعلى مجلد تقني.

## Phase A — Breadth

Build bounded material operational universe across outcomes, actors, authority, responsibilities, journeys, states, transitions, invariants, handoffs, truth ownership, writers/readers/consumers, flows and implementation/runtime boundaries. Evidence may come from code/DB/runtime but remains evidence.

## Phase B — Coverage gate

Machine registry computes accounting. No manual `YES` is sufficient. Missing material item/evidence, unresolved applicable category, stale SHA, or failed negative-space/adversarial challenge = FAIL-CLOSED.

## Phase C — Competitive deepening

Deepen only root candidates that can win/invalidate/block/change material leverage. Stop deepening a candidate when evidence proves it cannot outrank the current winner and cannot invalidate/block it; keep it accounted for later.

## Phase D — Frontier

Frontier requires operational graph position + causal cluster + comparative ranking + complete affected blast radius/dependencies/consumers + no unresolved upstream winner.

## Lower-layer hold

Technical observations are never discarded. HOLD prevents time waste; PROMOTED requires proof. Cosmetic/hygiene may execute only after higher roots no longer govern the affected cone or as required cleanup of the root cutover.

## Re-ranking

Every material mutation/discovery that can alter authority, state ownership, journey semantics, dependency position, risk or blast radius invalidates affected rank/frontier. Re-rank only affected cone unless evidence requires broader reopening.
