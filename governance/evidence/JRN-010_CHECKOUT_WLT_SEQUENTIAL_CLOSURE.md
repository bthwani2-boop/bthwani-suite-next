# JRN-010 — Checkout and WLT Handoff Sequential Closure

- Branch: `sambassam`
- Verification commit before evidence: `cbb4f0e1e319785b7d8ca13d656701b012beaccf`
- Decision: `READY_FOR_REVIEW`
- Scope: JRN-010 only; execution stopped before JRN-011.

## Sequential slices

1. Checkout intent creation from an authenticated tenant-scoped valid cart.
2. Final cart, pricing, address ownership and serviceability validation.
3. Governed fulfillment and payment-method selection.
4. WLT-owned payment-session reference with indeterminate-outcome classification.
5. Tenant-scoped WLT event projection; expiry remains distinct from payment failure.
6. Complete visible lifecycle including `wlt_outcome_unknown`.
7. Idempotent retries using the same checkout/WLT mutation identity.
8. Later idempotent operator reconciliation for unknown outcomes.
9. Read-only operator monitoring plus a governed reconciliation action.

## Financial boundary

DSH stores operational checkout state, pricing snapshots and opaque WLT references. WLT remains the sole authority for payment execution, capture, wallet mutation, refunds and settlements.

## Verification executed

- `go test ./internal/checkout ./internal/wlt ./internal/http`
- `node --test tools/guards/checkout/jrn-010-checkout-truth-gate.mjs`
- `git diff --check`

`CLOSED_WITH_EVIDENCE` is not claimed here because clean-database migration application, live DSH↔WLT runtime execution, visual QA and independent release/security/finance approvals were not produced by this targeted remote workflow.
