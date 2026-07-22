# JRN-026 Remote Slice Execution

- `repository_mode`: `REMOTE_ONLY`
- `repository`: `bthwani2-boop/bthwani-suite-next`
- `target_branch`: `sambassam`
- `initial_head`: `83d877aa52a644786fc64d1da270087345c3884d`
- `journey`: `JRN-026 — القسائم وتسعير التوصيل وسياسات الولاء`
- `mode`: `fullstack unified multi-surface`
- `current_decision`: `VERIFYING_FINAL_REMOTE_GATE`
- `verification_workflow`: `.github/workflows/jrn-026-coupons-pricing-loyalty-verification.yml`
- `verification_concurrency`: `event/sha isolated; cancel-in-progress=false`

## Implemented corrections

### Coupon lifecycle, limits, scope, and funding

- Mounted `CouponTermsEditor` inside the control-panel coupon card.
- Added governed editing for name, description, store scope, discount type/value, minimum subtotal, maximum discount, global/per-client limits, eligible fulfillment modes, and validity window.
- Active and archived coupon terms remain immutable; optimistic versioning and authoritative reload are preserved.
- Existing maker-checker activation, encrypted coupon code, serializable mutation, WLT promotion-funding reservation/commit/release/reversal, and reconciliation readback remain the owners of truth.
- Added the public capability entrypoint `frontend/shared/marketing/coupons.public.ts` and focused coupon-term tests.

### Operator delivery pricing

- Added `operator-delivery-pricing.public.ts` as the public capability boundary.
- Enabled first-policy creation with `expectedVersion=0` for each explicit mode.
- Added actionable loading, empty-create, error, retry, success, conflict, and persisted-version readback states.
- Forced pickup pricing to zero at the UI and retained database/backend enforcement.
- Mounted `OperatorDeliveryPricingPanel` inside the partner-detail stores tab, with store selection and open/close pricing controls.

### Partner delivery pricing

- Enabled first partner-delivery policy creation with `expectedVersion=0`.
- Removed the dead empty state and exposed Arabic create/update/retry states.
- Mounted `PartnerDeliveryPricingCard` in `DshPartnerStoreCourierScreen`.
- Added `partner-delivery-pricing.public.ts`; surfaces no longer import private controller modules or the legacy operator projection.
- Backend store ownership, `partner_delivery` mode restriction, archive prohibition, OCC, and audit remain enforced.

### Loyalty earning policies and WLT boundary

- Added governed `updateTerms` with `expectedVersion` and reload.
- Added editable name, earning numerator/denominator, minimum, and maximum points for draft/paused policies only.
- Active policy terms remain immutable; maker-checker activation remains enforced.
- Added `loyalty-policy.public.ts` and focused UI/backend/WLT assertions.
- DSH emits durable idempotent earn/reverse events; WLT remains sovereign for balances, entries, and single reversal.

### Contract, governance, and verification

- Added focused route test `TestJourney026ExposesGovernedCouponPricingAndLoyaltyRoutes`.
- Added focused TypeScript graph `services/dsh/tsconfig.jrn-026.json`.
- Added JRN-026 tests for coupon terms, partner/operator pricing mounts and first creation, client authoritative readback, maker-checker, and WLT sovereignty.
- Added Product Truth contract and executable journey validator, restored the Product Truth dispatcher, and kept independent product-owner acceptance pending.
- Split Go packages, TypeScript, static invariants, Product Truth, OpenAPI source truth, and generated-client checks into named permanent CI steps.
- Removed all temporary execution and OpenAPI synchronization workflows after use.

## Sequential slice record

| Slice | Requirement | Status |
|---|---|---|
| FS-01 | Product Truth and acceptance criteria | IMPLEMENTED |
| FS-02 | Roles, permissions, surfaces, forbidden actions | IMPLEMENTED |
| FS-03 | States, transitions, allowed actions, negative invariants | IMPLEMENTED |
| FS-04 | Truth ownership and service boundaries | IMPLEMENTED |
| FS-05 | Database constraints, indexes, concurrency | IMPLEMENTED |
| FS-06 | OpenAPI contracts and approved adapters | VERIFIED_ON_REMOTE; FINAL_COMBINED_GATE_RUNNING |
| FS-07 | Backend routes, validation, authz, idempotency | IMPLEMENTED |
| FS-08 | Events, outbox, readback, retry, reconciliation | IMPLEMENTED |
| FS-09 | Shared brain types, adapters, controllers, view models | IMPLEMENTED |
| FS-10 | Required surface routes, screens, actions, navigation | IMPLEMENTED |
| FS-11 | Loading, empty, forbidden, conflict, recovery states | IMPLEMENTED |
| FS-12 | Multi-surface readback and removal of local truth | IMPLEMENTED |
| FS-13 | Security, tenant isolation, RBAC, audit | IMPLEMENTED |
| FS-14 | Arabic/RTL, reliability, recovery behavior | IMPLEMENTED |
| FS-15 | Observability, diagnostics, operational support | IMPLEMENTED |
| FS-16 | Legacy, duplicate, temporary workflow cleanup | IMPLEMENTED |
| FS-17 | Static, backend, finance-boundary, governance, and CI verification | FINAL_COMBINED_GATE_RUNNING |
| FS-18 | Same-commit evidence and remaining-risk decision | VERIFYING_FINAL_REMOTE_GATE |

## Remote check evidence before the final combined rerun

A prior focused run passed all of the following before reaching the then-missing Product Truth executable:

1. Governed coupon package compilation.
2. Delivery-pricing and checkout package compilation.
3. Loyalty-policy package compilation.
4. DSH WLT adapter and durable outbox compilation.
5. Focused JRN-026 route registration.
6. Sovereign WLT commercial loyalty-ledger compilation.
7. Focused JRN-026 TypeScript verification.
8. JRN-026 static, negative-invariant, and cross-surface tests.

The dedicated DSH modular OpenAPI workflow also passed after the current contract state. The missing Product Truth executable was corrected by adding `tools/guards/jrn-026-product-truth-gate.mjs` and restoring `tools/guards/product-truth-gate.mjs`.

## Final verification gate

The current evidence update intentionally triggers the permanent remote workflow. Final technical verification requires the same commit to pass:

1. DSH coupon, checkout/pricing, loyalty, WLT-adapter, and outbox packages.
2. Focused governed route registration.
3. Sovereign WLT loyalty ledger.
4. Focused TypeScript surfaces and public capability boundaries.
5. All `jrn-026-*.test.mjs` assertions.
6. JRN-026 Product Truth semantics.
7. DSH modular OpenAPI source truth and generated client.

## Closure boundary

The implementation agent does not grant independent product-owner, finance, QA, security, release, deployment, or production approvals. `CLOSED_WITH_EVIDENCE` remains prohibited until the final remote gate succeeds and the required independent runtime, visual, finance, security, QA, release, and product acceptance evidence exists.
