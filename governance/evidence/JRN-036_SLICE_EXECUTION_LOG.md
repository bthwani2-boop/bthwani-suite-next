# JRN-036 — Settlement and Commission Slice Execution Log

- Repository mode: `REMOTE_ONLY`
- Repository: `bthwani2-boop/bthwani-suite-next`
- Target branch: `sambassam`
- Journey: `JRN-036 — التسويات والعمولات`
- Financial truth owner: `WLT`
- Operational evidence owner: `DSH`
- Execution command: `governance/prompting/unified-operational-journey-execution-command.md`
- Product truth: `governance/product/contracts/jrn-036-settlements-commissions.product-truth.json`

## Slice 01 — durable DSH inputs

**Implemented**

- DSH derives delivered-order sources from authoritative order/status/pricing data.
- DSH sends `orderId`, gross source basis, currency, delivered timestamp, pricing snapshot hash, completion event identity, completion evidence hash, and explicit non-cancelled status.
- DSH does not send settlement fee, net amount, refund amount, or commission amount.
- Field visit commission handoff continues to send actor/source/visit/store identities and an idempotency key without a monetary value.

**Primary paths**

- `services/dsh/backend/internal/http/finance_settlement_sources.go`
- `services/dsh/backend/internal/wlt/client.go`
- `services/dsh/backend/internal/wlt/commission_client.go`

## Slice 02 — completion, cancellation, and refund verification

**Implemented**

- WLT rejects missing completion/pricing evidence and any source not marked `not_cancelled`.
- WLT validates that delivered timestamps are inside the requested cycle.
- WLT reads completed refund truth from `wlt_refunds` and subtracts it from each order basis.
- WLT rejects refund totals exceeding the authoritative order gross and refuses a zero payable cycle.
- Every verified source retains original gross, completed refund, settlement basis, evidence hashes, and verification time.

**Primary paths**

- `services/wlt/backend/internal/settlement/jrn036_evidence_settlement.go`
- `services/wlt/database/migrations/wlt-090_jrn036_settlement_commission_governance.sql`

## Slice 03 — versioned policies

**Implemented**

- Settlement policies retain version, fee basis points, currency, cycle days, minimum net, status, reason, and operator.
- Commission policies retain version, actor/source/commission types, fixed or basis-points calculation, minimum/maximum bounds, currency, status, reason, and operator.
- Activating a new commission policy deactivates the prior active policy for the same governed scope.
- Existing sovereign fixed field-visit policies are adopted into the versioned policy history.

**Primary paths**

- `services/wlt/backend/internal/settlement/jrn036_evidence_settlement.go`
- `services/wlt/backend/internal/cod/jrn036_governed_commission.go`
- `services/wlt/database/migrations/wlt-090_jrn036_settlement_commission_governance.sql`

## Slice 04 — settlement creation, summary, and cycle

**Implemented**

- Settlement creation is evidence-backed, refund-aware, deterministic, and idempotent.
- Request hash and idempotency key are persisted separately from settlement identity.
- Exact settlement policy version is retained.
- Existing WLT settlement summary and cycle read routes remain the canonical read model.
- Control panel can request settlement creation and inspect retained source evidence through DSH.

**Primary paths**

- `services/wlt/backend/internal/settlement/jrn036_evidence_settlement.go`
- `services/wlt/backend/internal/http/server.go`
- `services/dsh/backend/internal/http/finance_settlement_sources.go`
- `services/dsh/backend/internal/http/finance_commission_governance.go`
- `services/dsh/backend/internal/http/representative_finance_routes.go`

## Slice 05 — WLT-owned commission calculation

**Implemented**

- The governed commission creation request has no `amountMinorUnits` field.
- Strict JSON decoding rejects unknown caller-supplied financial fields.
- WLT selects the active policy and calculates fixed or basis-points commission amounts with minimum/maximum bounds.
- WLT creates the commission, wallet projection, balanced ledger transaction, policy/evidence record, request hash, and audit event in one transaction.
- Field visits remain backward-compatible while still deriving the amount only from WLT policy.

**Primary paths**

- `services/wlt/backend/internal/cod/jrn036_governed_commission.go`
- `services/wlt/backend/internal/cod/jrn036_governed_commission_test.go`
- `services/wlt/contracts/jrn-036-settlements-commissions.openapi.yaml`

## Slice 06 — confirm, settle, reject, and reverse

**Implemented**

- `pending -> confirmed`
- `confirmed -> settled`
- `pending -> rejected`
- `settled -> reversed`
- Illegal source states return conflicts.
- Settlement reclassifies pending wallet value to available value.
- Rejection and reversal enforce non-negative wallet guards and balanced reversing ledger effects.
- Each lifecycle action appends a correlation-linked audit event.

**Primary paths**

- `services/wlt/backend/internal/cod/jrn036_governed_lifecycle.go`
- `services/wlt/backend/internal/http/server.go`
- `services/dsh/backend/internal/http/finance_commission_governance.go`

## Slice 07 — deductions and adjustments

**Implemented**

- Adjustments require a non-zero signed delta, explicit reason, operator identity, correlation ID, and idempotency key.
- Adjustments are limited to pending or confirmed commissions.
- A negative adjustment cannot make pending or earned wallet buckets negative.
- Every adjustment posts a balanced ledger transaction and persists a first-class adjustment record plus audit event.

**Primary paths**

- `services/wlt/backend/internal/cod/jrn036_governed_commission.go`
- `services/wlt/database/migrations/wlt-090_jrn036_settlement_commission_governance.sql`

## Slice 08 — representative and operator surfaces

**Implemented**

- Partner surface reads its own wallet and commission lifecycle from WLT through DSH.
- Captain earnings surface reads its own wallet and commission lifecycle from WLT through DSH.
- Field finance surface continues to read actor-scoped WLT commission records through DSH.
- Control panel exposes policy creation, commission list, confirm, settle, reject, reverse, and reasoned adjustment actions.
- Canonical commission types include policy identity, source identity, all lifecycle states, and resolution reason.
- Settlement evidence and commission detail endpoints expose retained evidence and adjustments to authorized control-panel operators.

**Primary paths**

- `services/dsh/frontend/shared/finance-wlt-link/jrn036/`
- `services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshPartnerBridge.tsx`
- `services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx`
- `services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx`
- `services/dsh/frontend/control-panel/finance/Jrn036CommissionGovernancePanel.tsx`
- `services/dsh/frontend/control-panel/finance/PayoutRequestsPanel.tsx`

## Contracts, gates, and checks

**Added**

- OpenAPI contract: `services/wlt/contracts/jrn-036-settlements-commissions.openapi.yaml`
- Static boundary gate: `tools/guards/jrn-036-settlement-commission-gate.mjs`
- Remote verification workflow: `.github/workflows/jrn-036-settlement-commission-verification.yml`
- Targeted WLT calculation/evidence tests.
- Targeted DSH and WLT package compilation in GitHub Actions.

## Zero-gate status

| Gate | Status | Evidence |
|---|---|---|
| Product truth and scope | IMPLEMENTED / APPROVAL PENDING | product-truth contract; independent PM/PO decision not self-issued |
| Truth ownership | IMPLEMENTED STATICALLY | WLT calculation and persistence; DSH evidence-only handoff |
| Database invariants | IMPLEMENTED / RUNTIME PENDING | additive migration and SQL constraints; live migration evidence pending |
| API and service auth | IMPLEMENTED STATICALLY | service token, mutation gate, correlation and idempotency requirements |
| Idempotency | IMPLEMENTED STATICALLY | persisted keys and request hashes for settlements, commissions, adjustments |
| Financial arithmetic | TARGETED TESTS ADDED | Go calculation/evidence tests; remote workflow result pending retrieval |
| Actor isolation | IMPLEMENTED STATICALLY | self routes resolve actor server-side; control mutations require permissions |
| Frontend binding | IMPLEMENTED STATICALLY | partner, captain, field, and control-panel bindings |
| Runtime integration | PENDING EVIDENCE | no database/runtime environment was deployed or mutated by this remote-only task |
| Visual/accessibility | PENDING INDEPENDENT EVIDENCE | no device/browser screenshot matrix or accessibility report available |
| Security/finance review | PENDING INDEPENDENT EVIDENCE | cannot be self-approved by implementation agent |
| Release/production | NOT AUTHORIZED | no PR merge, release, SaaS activation, or production deployment performed |

## Decision

`READY_FOR_REVIEW`

The journey's code, data, contract, routing, and required surfaces are implemented on `sambassam`. It is not marked `CLOSED` because runtime migration/integration evidence, remote workflow result retrieval, visual/accessibility evidence, and independent product/finance/security approvals are still required by the governing command.
