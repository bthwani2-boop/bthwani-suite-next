# U004 — client-order-lifecycle-tracking-fulfillment

## Scope and owner

**Execution concern:** customer order lifecycle, preparation decisions, pickup, live tracking, delivery proof and cross-surface convergence

**Objective:** Make every client order list/detail/tracking/pickup/delivery state a projection of the same legal DSH state machine changed by authorized partner, captain or operator actions.

**Canonical owner:** DSH owns order/fulfillment/custody operational truth; other surfaces are authorized actors or readbacks, not parallel owners.

This unit is intentionally bounded to the client consequence. It does not authorize a broad rewrite of adjacent Partner, Captain, Field or control-panel behavior. A shared surface enters implementation only when its current command, policy or committed readback changes one of the customer journeys listed in `EXECUTION.json`.

## Evidence-led diagnosis

The pinned source shows this capability is already represented in the app-client composition, but file or screen presence is not closure evidence. The implementation must trace each customer-visible query or command through the shared contract/client, server authorization, canonical owner, persistence or provider effect, and post-mutation readback. Where Product Truth defines idempotency, version, actor/object scope, privacy, serviceability or financial ownership, those invariants outrank UI convenience.

The primary risk is a partial vertical slice: UI may expose a state while backend/database authorization, retry behavior, stale-state conflict, cross-surface convergence or offline recovery remains unproven. The correction order is owner-first. Fix the first authoritative divergence, migrate only directly affected consumers, then remove obsolete fallback after compatibility and rollback evidence exists.

## Boundaries

Do not create a second source of truth, trust actor/platform/operator context supplied by the mobile client, convert optimistic UI state into final business truth, weaken authorization for development convenience, or claim runtime/database/financial closure from static checks. Preserve DSH/WLT/Identity ownership and privacy boundaries. Cross-surface changes must be the minimum needed for the same customer-visible canonical state.

## Completion evidence

Closure requires all checks in `VERIFICATION.json` on the exact resulting SHA plus negative evidence appropriate to the mutation: unauthorized actor/object, duplicate/retry, stale version/conflict, dependency unavailable and offline/recovery where applicable. Any blocker keeps the unit open; package existence alone is not evidence of implementation.
