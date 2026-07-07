# Execution Plan

status: `DISCOVERY_PACKAGE_ONLY`

This file defines the future execution order after the journey package is accepted. It does not implement behavior.

## Phase 1: Focused Inspection

- Inspect each listed client, partner, captain, control-panel, shared, backend, API, and generated client path.
- Map every UI action, icon, state, tab, and section to a handler or blocker.
- Map each OpenAPI operation to generated client, backend route, handler, service, repository, and database truth.
- Map WLT financial boundary touchpoints.

## Phase 2: Classification

- Convert every `BLOCKED_NEEDS_EVIDENCE` into a concrete file decision.
- Convert every `FIX_REQUIRED` into a specific bind, move, split, merge, or test action.
- Keep all delete decisions blocked until full reference proof exists.

## Phase 3: Binding And Cleanup

- Bind frontend surfaces through shared controllers/view-models/adapters.
- Split transport from shared domain logic where required.
- Bind generated client and OpenAPI operations to backend route evidence.
- Move or split local business logic out of surfaces only after source inspection.
- Preserve WLT ownership for financial truth.

## Phase 4: Verification

- Run targeted guards for frontend binding, backend API binding, go routes, and operational factory integrity.
- Run relevant typecheck after behavior changes.
- Run runtime smoke only if runtime behavior is changed or live-readiness is claimed.

## Execution Stop Conditions

- Stop if a required surface is unclassified.
- Stop if API/backend/database alignment is unproven.
- Stop if a delete/move/merge lacks reference proof.
- Stop if WLT/DSH boundary is unclear.
- Stop if runtime readiness is requested without runtime evidence.
