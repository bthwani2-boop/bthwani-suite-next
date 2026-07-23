# JRN-035 — Identity-bound finance tenant repair

- Target ref: `lianbassam`
- Execution mode: remote-only, code-first, unified full-stack multi-tenant SaaS
- Date: 2026-07-23
- Production deployment authorized: **no**
- Product activation/approval changed: **no**

## Reported symptom

The control-panel finance surface at `/dsh/finance` displayed `WLT runtime غير متاح` and the refund channel reported `MISSING_TENANT_ID` even though the operator had an authenticated Identity session.

## Root cause

The DSH control-panel refund and payment-session handlers required a browser-supplied `X-Tenant-ID` header or `tenantId` query value. The same protected handlers had already resolved the authenticated actor through Identity, including `actor.TenantID`, but that trusted tenant context was not used by the affected finance paths.

This created an invalid SaaS boundary: the browser was treated as the tenant authority while the authenticated Identity actor was ignored.

## Implemented boundary

1. The authenticated Identity actor tenant is the authoritative DSH finance tenant.
2. A legacy `X-Tenant-ID` header or `tenantId` query value is optional and may only confirm the authenticated tenant.
3. A supplied mismatch fails closed with `TENANT_MISMATCH`.
4. A session lacking an Identity tenant fails closed with `MISSING_TENANT_ID`.
5. DSH forwards the resolved tenant to WLT server-to-server; the frontend does not become the financial tenant authority.
6. Client and partner refund reads continue deriving tenant scope from owned DSH orders and preserve their privacy-safe projection.
7. `amountMinorUnits = 0` remains the canonical command for the full remaining refundable amount; negative values are rejected.

## Code scope

- `services/dsh/backend/internal/http/finance_payment_sessions.go`
- `services/dsh/backend/internal/http/financeproxy.go`
- `services/dsh/backend/internal/http/refund_finance_handlers.go`
- `services/dsh/backend/internal/http/finance_payment_sessions_tenant_test.go`
- `services/dsh/frontend/control-panel/finance/FinanceDashboardScreen.tsx`
- `services/dsh/contracts/jrn-035-refunds.openapi.yaml`
- `tools/guards/jrn-035-wlt-refund-boundary-gate.mjs`
- `tools/verification/jrn-035-financial-refunds.test.mjs`
- `tools/verification/jrn-035-openapi-contracts.test.mjs`

## Verification invariants added

- The actor tenant succeeds without a browser tenant selector.
- A matching legacy selector is accepted only as confirmation.
- A mismatching selector returns HTTP 403 and `TENANT_MISMATCH`.
- A missing authenticated actor tenant returns HTTP 400 and `MISSING_TENANT_ID`.
- Refund read, command, reconciliation and audit handlers all bind to `actor.TenantID`.
- The JRN-035 OpenAPI contract declares `X-Tenant-ID` optional and Identity-derived tenant context authoritative.
- Guard coverage rejects reintroduction of the former two-argument browser-authoritative tenant helper.
- The zero-as-full-remaining refund amount contract remains aligned between DSH and WLT.

## Commit evidence

- `7095fe5ba70c77e0f3dcd11f11d9aae06750953e` — derive payment tenant from authenticated actor.
- `b4e4ddd99d2016d7294faa46c0dd5ae6305565c8` — bind refund reads to Identity tenant.
- `4923fc79967879345c30678039047eee5e6fdb06` — add tenant-boundary unit tests.
- `0afdeef5e2e71dcd595974eb859f4fd21f46e1c2` — expose actionable finance runtime failure guidance.
- `9ce694487129fff2989e350a008653662af0b33f` — preserve full-remaining refund command semantics.
- `b2b836e77a80a11a111dffd94be8bbd726009c9c` — align the JRN-035 DSH OpenAPI tenant contract.
- `719418baca7d1e4202de39c14714121684eba847` — verify Identity tenant authority in OpenAPI.
- `ab3ae9f0bd6ae4c3e90a53760d16e497f4cf0797` — enforce tenant and amount parity through the JRN-035 guard.

## Runtime and CI truth

A prior contextual workflow run (`30035490299`) was superseded by concurrent pushes to `lianbassam`; its aggregate failure was produced from cancelled prerequisite jobs rather than a reported test assertion. A new immutable full-verification run must be evaluated on the final branch head.

No runtime restart, database integration proof, browser replay or production deployment is claimed by this document. The repair remains subject to the repository's same-commit CI/runtime evidence policy.
