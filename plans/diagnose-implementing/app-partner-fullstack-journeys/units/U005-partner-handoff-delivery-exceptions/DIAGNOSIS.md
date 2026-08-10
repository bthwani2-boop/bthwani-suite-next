# Diagnosis — U005 partner-handoff-delivery-exceptions

## Inclusion reason

Store-to-Captain custody is a direct Partner outbound journey after order preparation. Product Truth requires Partner release confirmation, Captain pickup completion, operator exception resolution and client lifecycle readback to converge on DSH custody/assignment truth. app-field and financial mutation are explicitly excluded from this capability.

## Current behavior and observable defect

The Partner order renderer routes handoff/delivering states to shared operational flows, and backend helpers already enforce Store/order ownership patterns. That structure does not prove bilateral custody ordering, reassignment supersession, shortage/mismatch persistence, duplicate retry safety, or readback after refresh. A dangerous failure class is Captain pickup becoming executable before Partner release, or an old assignment remaining actionable after reassignment. Another is an exception recorded only in UI state while operator/client continue reading the pre-exception lifecycle.

## Root cause and target architecture

DSH dispatch/custody is the sole owner. Partner and Captain actions are two authorized sides of one persisted custody transition, not separate success flags. Assignment identity/version, Store/order scope, exception evidence and supersession must be enforced transactionally and exposed through canonical readback. WLT cannot be mutated from custody handling.

## Exact affected paths and symbols

Affected code includes Partner order/handoff screens, shared dispatch/handoff controllers, app-captain pickup flow, control-panel Operations exception resolution, DSH backend/database/contracts. Key concepts include Partner release confirmation, Captain pickup guard, `partnerOrder`, assignment version/supersession and Store-Captain handoff exception handlers.

## Risks and evidence

Test wrong Partner/Store/order, wrong Captain/assignment, duplicate confirm/pickup, reassignment, shortage/mismatch, refresh/restart and client/operator readback. Do not introduce DSH financial effects. Evidence: `EV-005`, `EV-018`, `EV-019`.
