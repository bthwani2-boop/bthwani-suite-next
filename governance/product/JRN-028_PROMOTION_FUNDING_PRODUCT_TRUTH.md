# JRN-028 — Promotion Funding Product Truth

- Journey: `JRN-028`
- Arabic name: `تمويل العروض والترويج`
- Primary operator surface: `control-panel / marketing / coupons`
- Operational owner: DSH
- Financial owner: WLT
- Default mutation state: disabled unless `WLT_MUTATIONS_ENABLED=true` and authenticated DSH service authorization succeeds

## Actors and permissions

1. The client applies an eligible governed coupon during checkout. The client never chooses the funding source, split, tenant, or WLT reference.
2. Marketing operators with `marketing.read` can read policy and reconciliation status.
3. Marketing operators with `marketing.manage` can configure funding policy only while the coupon state permits editing.
4. DSH is the only accepted service caller for WLT promotion-funding reads and mutations.
5. Manual control-panel commit, release, and reverse actions are intentionally absent. Lifecycle mutations are derived from governed checkout, order, cancellation, expiry, and refund truth.

## Source-of-truth boundary

- DSH owns coupon eligibility, discount calculation, approved platform/partner split, checkout and order references, and the operational projection.
- WLT owns reservation state, transition legality, monetary audit events, and terminal financial state.
- DSH stores only the opaque WLT reservation reference and a projection required for operations.
- The control panel compares DSH projection with an authenticated WLT readback; it does not act as a ledger.

## Lifecycle

1. `reserve`: DSH calculates the immutable split and asks WLT to reserve it with tenant, idempotency, and correlation assertions.
2. `commit`: creation of the governed order enqueues an idempotent transition through the durable DSH outbox.
3. `release`: checkout cancellation or expiry releases a reservation that has not committed.
4. `reverse`: cancellation/refund after commit creates a governed reverse transition tied to the order and reason.
5. Every WLT state transition must commit with one matching append-only event; a reused idempotency key cannot silently change state without audit evidence.

## Failure and recovery

- DSH outbox delivery is retryable and records attempts and the last failure.
- A WLT timeout does not cause DSH to invent a financial state.
- Control-panel reconciliation classifies records as `reconciled`, `mismatch`, `wlt_unavailable`, or `incomplete`.
- Internal idempotency keys, correlation identifiers, and WLT audit reasons are never returned to browser surfaces.

## Acceptance criteria

- Funding split equals the total discount and cannot change after reservation begins.
- Partner-funded amounts require the governed partner and store ownership match.
- Tenant assertion is mandatory for authenticated promotion-funding service calls.
- WLT terminal transitions are immutable and audit-event-backed.
- DSH and WLT status, identity, currency, and amounts are compared in the operator read model.
- Loading, empty, error, retry, mismatch, and unavailable states are visible in Arabic RTL UI.

## Approval boundary

This file records implemented product truth. It does not self-issue independent Finance, Security, QA, Release, or Production approval. Those decisions must be attached to the exact verified commit before governance status may be promoted to `CLOSED_WITH_EVIDENCE`.
